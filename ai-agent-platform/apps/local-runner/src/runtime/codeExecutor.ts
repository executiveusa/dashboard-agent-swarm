import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { LocalRunnerConfig } from './config.js';
import { ResourceExceededError, Session } from './sessions.js';

export interface CodeExecutionRequest {
  runtime: 'python' | 'node';
  source: string;
}

export interface CodeExecutionResponse {
  stdout: string;
  stderr: string;
  artifacts: Array<{ name: string; path: string; size: number }>;
  runtime: number;
}

export class CodeExecutor {
  constructor(private readonly config: LocalRunnerConfig['code']) {}

  async execute(session: Session, request: CodeExecutionRequest): Promise<CodeExecutionResponse> {
    await mkdir(this.config.workingDirectory, { recursive: true });
    const workdir = await mkdtemp(join(this.config.workingDirectory, `${session.id}-`));
    const extension = request.runtime === 'python' ? 'py' : 'mjs';
    const entrypoint = join(workdir, `snippet.${extension}`);
    await mkdir(workdir, { recursive: true });
    await writeFile(entrypoint, request.source, 'utf8');

    const command = request.runtime === 'python' ? 'python3' : process.execPath;
    const args = request.runtime === 'python' ? ['-u', entrypoint] : [entrypoint];

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let capturedBytes = 0;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.maxExecutionMs);

    const started = Date.now();

    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(command, args, {
          cwd: workdir,
          stdio: ['ignore', 'pipe', 'pipe'],
          signal: controller.signal,
        });

        child.stdout.on('data', (chunk: Buffer) => {
          capturedBytes += chunk.length;
          if (capturedBytes > this.config.maxOutputBytes) {
            controller.abort();
            reject(new ResourceExceededError('Code execution output limit exceeded'));
            return;
          }
          stdoutChunks.push(chunk);
        });

        child.stderr.on('data', (chunk: Buffer) => {
          capturedBytes += chunk.length;
          if (capturedBytes > this.config.maxOutputBytes) {
            controller.abort();
            reject(new ResourceExceededError('Code execution output limit exceeded'));
            return;
          }
          stderrChunks.push(chunk);
        });

        child.on('error', reject);
        child.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Interpreter exited with code ${code}`));
          }
        });
      }).catch((error) => {
        if (controller.signal.aborted && !(error instanceof ResourceExceededError)) {
          return Promise.reject(new ResourceExceededError('Code execution aborted'));
        }
        return Promise.reject(error);
      });

      const artifacts: Array<{ name: string; path: string; size: number }> = [];
      const files = await readdir(workdir);
      let totalArtifactBytes = 0;
      for (const file of files) {
        if (file === `snippet.${extension}`) continue;
        const artifactPath = join(workdir, file);
        const info = await stat(artifactPath);
        if (!info.isFile()) continue;
        totalArtifactBytes += info.size;
        if (totalArtifactBytes > this.config.maxArtifactBytes) {
          throw new ResourceExceededError('Code execution artifact budget exceeded');
        }
        artifacts.push({ name: file, path: artifactPath, size: info.size });
      }

      return {
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
        artifacts,
        runtime: Date.now() - started,
      };
    } finally {
      clearTimeout(timer);
      await rm(workdir, { recursive: true, force: true });
    }
  }
}
