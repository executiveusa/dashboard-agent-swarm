import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import fetch from 'node-fetch';
import { chromium, type Browser, type Page } from 'playwright-core';
import { getEnv } from './env.js';

export type BrowserVerb = 'open' | 'click' | 'type' | 'waitFor' | 'screenshot' | 'evaluate';

export interface BrowserAction {
  verb: BrowserVerb;
  args?: unknown[];
}

export interface BrowserActionResult {
  logs: string[];
  screenshotPath?: string;
  evaluations?: unknown[];
}

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  artifacts: Array<{ name: string; path: string }>;
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

  async executeBrowserPlan(plan: BrowserAction[]): Promise<BrowserActionResult> {
    if (this.env.OI_MODE === 'local') {
      return this.forwardToLocal('browser', { plan }) as Promise<BrowserActionResult>;
    }

    let browser: Browser | undefined;
    const logs: string[] = [];
    const evaluations: unknown[] = [];
    const screenshotDir = await mkdtemp(join(tmpdir(), 'oi-'));
    let screenshotPath: string | undefined;

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

      return { logs, screenshotPath, evaluations };
    } catch (error) {
      logs.push(`Browser execution failed: ${(error as Error).message}`);
      throw error;
    } finally {
      await browser?.close();
    }
  }

  async runCode(runtime: 'python' | 'node', source: string): Promise<CodeExecutionResult> {
    if (this.env.OI_MODE === 'local') {
      return this.forwardToLocal('code', { runtime, source }) as Promise<CodeExecutionResult>;
    }

    const workdir = await mkdtemp(join(tmpdir(), 'oi-code-'));
    const extension = runtime === 'python' ? 'py' : 'mjs';
    const filename = join(workdir, `snippet.${extension}`);
    await writeFile(filename, source, 'utf8');

    const command = runtime === 'python' ? 'python3' : process.execPath;
    const args = runtime === 'python' ? ['-u', filename] : [filename];

    const controller = new AbortController();
    const started = Date.now();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const result = await this.spawnProcess(command, args, workdir, controller);
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
    controller: AbortController
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

    const artifacts: Array<{ name: string; path: string }> = [];
    try {
      const files = await readDirectorySafe(cwd);
      for (const file of files) {
        if (!file.endsWith('.py') && !file.endsWith('.mjs')) {
          artifacts.push({ name: file, path: join(cwd, file) });
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
    return (await response.json()) as BrowserActionResult | CodeExecutionResult;
  }
}

const readDirectorySafe = async (path: string): Promise<string[]> => {
  const { readdir } = await import('node:fs/promises');
  return readdir(path);
};

export const openInterpreter = new OpenInterpreterController();
