import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { LocalRunnerConfig } from './config.js';
import { ResourceExceededError, Session } from './sessions.js';

export interface BrowserAction {
  verb: 'open' | 'click' | 'type' | 'waitFor' | 'screenshot' | 'evaluate';
  args?: unknown[];
}

export interface BrowserActionResult {
  logs: string[];
  screenshotPath?: string;
  evaluations?: unknown[];
}

class BrowserSession {
  constructor(private readonly page: Page, private readonly config: LocalRunnerConfig['browser']) {}

  async perform(action: BrowserAction): Promise<unknown> {
    switch (action.verb) {
      case 'open':
        await this.page.goto(String(action.args?.[0] ?? ''), {
          waitUntil: 'networkidle',
          timeout: this.config.navigationTimeoutMs,
        });
        return undefined;
      case 'click':
        await this.page.click(String(action.args?.[0] ?? ''), {
          timeout: this.config.navigationTimeoutMs,
        });
        return undefined;
      case 'type':
        await this.page.fill(String(action.args?.[0] ?? ''), String(action.args?.[1] ?? ''), {
          timeout: this.config.navigationTimeoutMs,
        });
        return undefined;
      case 'waitFor':
        if (typeof action.args?.[0] === 'number') {
          await this.page.waitForTimeout(Number(action.args[0]));
        } else {
          await this.page.waitForSelector(String(action.args?.[0] ?? ''), {
            timeout: this.config.navigationTimeoutMs,
          });
        }
        return undefined;
      case 'screenshot': {
        const target = String(action.args?.[0] ?? join(this.config.screenshotDirectory, `${randomUUID()}.png`));
        await mkdir(this.config.screenshotDirectory, { recursive: true });
        await this.page.screenshot({ path: target, fullPage: true });
        return target;
      }
      case 'evaluate':
        return this.page.evaluate(String(action.args?.[0] ?? ''));
      default:
        throw new Error(`Unsupported browser verb: ${action.verb}`);
    }
  }
}

export class BrowserAutomation {
  constructor(private readonly config: LocalRunnerConfig['browser']) {}

  async execute(session: Session, plan: BrowserAction[]): Promise<BrowserActionResult> {
    if (!Array.isArray(plan) || plan.length === 0) {
      throw new Error('Browser plan must contain at least one action');
    }
    if (plan.length > this.config.maxActions) {
      throw new ResourceExceededError('Browser plan exceeds action quota');
    }
    for (const action of plan) {
      if (!action || typeof action !== 'object' || typeof action.verb !== 'string') {
        throw new Error('Browser plan contains an invalid action');
      }
    }

    await mkdir(this.config.screenshotDirectory, { recursive: true });
    const screenshotDir = await mkdtemp(join(this.config.screenshotDirectory, `${session.id}-`));
    const logs: string[] = [];
    const evaluations: unknown[] = [];
    let screenshotPath: string | undefined;

    let browser: Browser | undefined;

    try {
      browser = await chromium.launch({ headless: this.config.headless });
      const context = await browser.newContext({ viewport: this.config.viewport });
      const page = await context.newPage();
      const runtime = new BrowserSession(page, { ...this.config, screenshotDirectory: screenshotDir });

      for (const action of plan) {
        logs.push(`Executing ${action.verb}`);
        if (action.verb === 'screenshot') {
          const value = await runtime.perform({ ...action, args: [join(screenshotDir, `${randomUUID()}.png`)] });
          screenshotPath = String(value);
        } else {
          const result = await runtime.perform(action);
          if (action.verb === 'evaluate') {
            evaluations.push(result);
          }
        }
      }

      return { logs, screenshotPath, evaluations };
    } finally {
      await browser?.close();
    }
  }
}
