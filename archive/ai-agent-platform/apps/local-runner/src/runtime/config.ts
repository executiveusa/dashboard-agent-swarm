import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type ToolType = 'code' | 'browser';

export interface LocalRunnerConfig {
  port: number;
  maxSessions: number;
  sessionLifetimeMs: number;
  sessionIdleMs: number;
  sessionMaxExecutions: number;
  code: {
    maxExecutionMs: number;
    maxOutputBytes: number;
    maxArtifactBytes: number;
    workingDirectory: string;
  };
  browser: {
    maxActions: number;
    navigationTimeoutMs: number;
    headless: boolean;
    viewport: { width: number; height: number };
    screenshotDirectory: string;
  };
}

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return value === '1' || value?.toLowerCase() === 'true';
};

export const loadConfig = (): LocalRunnerConfig => {
  const port = toNumber(process.env.LOCAL_OI_PROXY_PORT, 3333);
  const headless = toBoolean(process.env.LOCAL_OI_BROWSER_HEADLESS, true);
  const maxSessions = toNumber(process.env.LOCAL_OI_MAX_SESSIONS, 6);

  return {
    port,
    maxSessions,
    sessionLifetimeMs: toNumber(process.env.LOCAL_OI_SESSION_LIFETIME_MS, 10 * 60 * 1000),
    sessionIdleMs: toNumber(process.env.LOCAL_OI_SESSION_IDLE_MS, 2 * 60 * 1000),
    sessionMaxExecutions: toNumber(process.env.LOCAL_OI_SESSION_MAX_EXECUTIONS, 12),
    code: {
      maxExecutionMs: toNumber(process.env.LOCAL_OI_CODE_TIMEOUT_MS, 60_000),
      maxOutputBytes: toNumber(process.env.LOCAL_OI_CODE_OUTPUT_BYTES, 1_000_000),
      maxArtifactBytes: toNumber(process.env.LOCAL_OI_CODE_ARTIFACT_BYTES, 10_000_000),
      workingDirectory: join(tmpdir(), 'oi-code'),
    },
    browser: {
      maxActions: toNumber(process.env.LOCAL_OI_BROWSER_MAX_ACTIONS, 20),
      navigationTimeoutMs: toNumber(process.env.LOCAL_OI_BROWSER_TIMEOUT_MS, 20_000),
      headless,
      viewport: {
        width: toNumber(process.env.LOCAL_OI_BROWSER_VIEWPORT_WIDTH, 1280),
        height: toNumber(process.env.LOCAL_OI_BROWSER_VIEWPORT_HEIGHT, 720),
      },
      screenshotDirectory: join(tmpdir(), 'oi-browser'),
    },
  };
};
