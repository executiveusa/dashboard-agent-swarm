import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import fetch from 'node-fetch';
import { chromium, type Browser, type Page } from 'playwright-core';
import { getEnv } from './env.js';
import { uploadLocalFileToSupabase, uploadBufferToSupabase, type UploadedArtifact } from './storage.js';

export type BrowserVerb = 'open' | 'click' | 'type' | 'waitFor' | 'screenshot' | 'evaluate';

export interface BrowserAction {
  verb: BrowserVerb;
  args?: unknown[];
}

export interface BrowserActionResult {
  logs: string[];
  screenshotUrl?: string;
  evaluations?: unknown[];
  artifacts?: UploadedArtifact[];
}

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  artifacts: UploadedArtifact[];
  runtime: number;
}

class BrowserSession {
  constructor(private page: Page) {}

  async perform(action: BrowserAction): Promise<unknown> {
    switch (action.verb) {
      case 'open':
        await this.page.goto(String(action.args?.[0] ?? ''), { waitUntil: 'networkidle' });
        return undefined;
      case 'click':
        await this.page.click(String(action.args?.[0] ?? ''), { timeout: 15000 });
        return undefined;
      case 'type':
        await this.page.fill(String(action.args?.[0] ?? ''), String(action.args?.[1] ?? ''), {
          timeout: 15000,
        });
        return undefined;
      case 'waitFor':
        if (typeof action.args?.[0] === 'number') {
          await this.page.waitForTimeout(Number(action.args?.[0]));
        } else {
          await this.page.waitForSelector(String(action.args?.[0] ?? ''), { timeout: 15000 });
        }
        return undefined;
      case 'screenshot':
        await this.page.screenshot({ path: String(action.args?.[0] ?? ''), fullPage: true });
        return action.args?.[0];
      case 'evaluate':
        return this.page.evaluate(String(action.args?.[0] ?? ''));
      default:
        throw new Error(`Unsupported browser verb: ${action.verb}`);
    }
  }
}

export class OpenInterpreterController {
  private env = getEnv();

  async executeBrowserPlan(
    plan: BrowserAction[],
    options: { sessionId?: string } = {}
  ): Promise<BrowserActionResult> {
    if (this.env.OI_MODE === 'local') {
      return (await this.forwardToLocal('browser', { plan, sessionId: options.sessionId })) as BrowserActionResult;
    }

    if (this.env.OPEN_INTERPRETER_API_URL) {
      const result = await this.forwardToCloud('browser', { plan, sessionId: options.sessionId });
      const artifacts = await this.persistCloudArtifacts(result?.artifacts, options.sessionId);
      const logs = Array.isArray(result?.logs) ? (result?.logs as string[]) : [];
      const evaluations = Array.isArray(result?.evaluations) ? result?.evaluations : undefined;
      const screenshotUrl =
        typeof result?.screenshotUrl === 'string'
          ? (result?.screenshotUrl as string)
          : artifacts[0]?.url;
      return {
        logs,
        evaluations,
        screenshotUrl,
        artifacts,
      };
    }

    let browser: Browser | undefined;
    const logs: string[] = [];
    const evaluations: unknown[] = [];
    const screenshotDir = await mkdtemp(join(tmpdir(), 'oi-'));
    let screenshotPath: string | undefined;
    const artifacts: UploadedArtifact[] = [];
    let screenshotUrl: string | undefined;

    try {
      browser = await chromium.launch({
        executablePath: this.env.PLAYWRIGHT_CHROMIUM_PATH,
        headless: true,
      });
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();
      const session = new BrowserSession(page);

      for (const action of plan) {
        logs.push(`Executing ${action.verb}`);
        if (action.verb === 'screenshot') {
          const target = String(action.args?.[0] ?? join(screenshotDir, `${randomUUID()}.png`));
          await session.perform({ ...action, args: [target] });
          screenshotPath = target;
        } else {
          const value = await session.perform(action);
          if (action.verb === 'evaluate') {
            evaluations.push(value);
          }
        }
      }

      if (screenshotPath) {
        try {
          const uploaded = await uploadLocalFileToSupabase(screenshotPath, {
            sessionId: options.sessionId,
          });
          artifacts.push(uploaded);
          screenshotUrl = uploaded.url;
        } catch (error) {
          logs.push(`Failed to upload screenshot: ${(error as Error).message}`);
        }
      }

      return { logs, screenshotUrl, evaluations, artifacts };
    } catch (error) {
      logs.push(`Browser execution failed: ${(error as Error).message}`);
      throw error;
    } finally {
      await browser?.close();
    }
  }

  async runCode(
    runtime: 'python' | 'node',
    source: string,
    options: { sessionId?: string } = {}
  ): Promise<CodeExecutionResult> {
    const started = Date.now();
    if (this.env.OI_MODE === 'local') {
      return (await this.forwardToLocal('code', { runtime, source, sessionId: options.sessionId })) as CodeExecutionResult;
    }

    if (this.env.OPEN_INTERPRETER_API_URL) {
      const result = await this.forwardToCloud('code', { runtime, source, sessionId: options.sessionId });
      const artifacts = await this.persistCloudArtifacts(result?.artifacts, options.sessionId);
      return {
        stdout: typeof result?.stdout === 'string' ? (result?.stdout as string) : '',
        stderr: typeof result?.stderr === 'string' ? (result?.stderr as string) : '',
        artifacts,
        runtime: typeof result?.runtime === 'number' ? (result?.runtime as number) : Date.now() - started,
      };
    }

    const workdir = await mkdtemp(join(tmpdir(), 'oi-code-'));
    const extension = runtime === 'python' ? 'py' : 'mjs';
    const filename = join(workdir, `snippet.${extension}`);
    await writeFile(filename, source, 'utf8');

    const command = runtime === 'python' ? 'python3' : process.execPath;
    const args = runtime === 'python' ? ['-u', filename] : [filename];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const result = await this.spawnProcess(command, args, workdir, controller, options.sessionId);
      return { ...result, runtime: Date.now() - started };
    } finally {
      clearTimeout(timeout);
      await rm(workdir, { recursive: true, force: true });
    }
  }

  private async spawnProcess(
    command: string,
    args: string[],
    cwd: string,
    controller: AbortController,
    sessionId?: string
  ): Promise<Omit<CodeExecutionResult, 'runtime'>> {
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      signal: controller.signal,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const exitCode: number = await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', resolve);
    });

    if (exitCode !== 0) {
      throw new Error(`Interpreter exited with code ${exitCode}: ${stderr}`);
    }

    const artifacts: UploadedArtifact[] = [];
    try {
      const files = await readDirectorySafe(cwd);
      for (const file of files) {
        if (!file.endsWith('.py') && !file.endsWith('.mjs')) {
          try {
            const uploaded = await uploadLocalFileToSupabase(join(cwd, file), {
              sessionId,
            });
            artifacts.push(uploaded);
          } catch (error) {
            stderr += `\nFailed to upload artifact ${file}: ${(error as Error).message}`;
          }
        }
      }
    } catch (error) {
      stderr += `\nArtifact collection failed: ${(error as Error).message}`;
    }

    return { stdout, stderr, artifacts };
  }

  private async forwardToLocal(
    tool: 'browser' | 'code',
    payload: unknown
  ): Promise<BrowserActionResult | CodeExecutionResult> {
    const response = await fetch(`${this.env.LOCAL_OI_PROXY_URL}/tools/${tool}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: randomUUID(), payload }),
    });
    if (!response.ok) {
      throw new Error(`Local OI proxy responded with ${response.status}`);
    }
    const result = (await response.json()) as BrowserActionResult | CodeExecutionResult;
    if (tool === 'code') {
      return {
        ...(result as CodeExecutionResult),
        artifacts: (result as CodeExecutionResult).artifacts ?? [],
      };
    }
    return result;
  }

  private async forwardToCloud(
    tool: 'browser' | 'code',
    payload: Record<string, unknown>
  ): Promise<any> {
    if (!this.env.OPEN_INTERPRETER_API_URL) {
      throw new Error('OPEN_INTERPRETER_API_URL is not configured');
    }

    const url = `${this.env.OPEN_INTERPRETER_API_URL.replace(/\/?$/, '')}/tools/${tool}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.env.OPEN_INTERPRETER_API_KEY) {
      headers.Authorization = `Bearer ${this.env.OPEN_INTERPRETER_API_KEY}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: randomUUID(), payload }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Open Interpreter cloud responded with ${response.status}: ${body}`);
    }

    return response.json();
  }

  private async persistCloudArtifacts(artifacts: unknown, sessionId?: string): Promise<UploadedArtifact[]> {
    if (!Array.isArray(artifacts)) {
      return [];
    }

    const uploads: UploadedArtifact[] = [];
    for (const entry of artifacts) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      const artifact = entry as Record<string, unknown>;
      const name = typeof artifact.name === 'string' && artifact.name.length > 0 ? artifact.name : `${randomUUID()}`;
      const contentType = typeof artifact.contentType === 'string' ? artifact.contentType : undefined;
      if (typeof artifact.url === 'string') {
        uploads.push({ name, url: artifact.url, contentType });
        continue;
      }
      const base64 = typeof artifact.base64 === 'string' ? artifact.base64 : undefined;
      if (base64) {
        try {
          const buffer = Buffer.from(base64, 'base64');
          const uploaded = await uploadBufferToSupabase(buffer, { sessionId, filename: name, contentType });
          uploads.push(uploaded);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Failed to persist cloud artifact', { error: (error as Error).message, name });
        }
      }
    }

    return uploads;
  }
}

const readDirectorySafe = async (path: string): Promise<string[]> => {
  const { readdir } = await import('node:fs/promises');
  return readdir(path);
};

export const openInterpreter = new OpenInterpreterController();
