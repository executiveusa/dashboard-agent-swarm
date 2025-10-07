import { EnvConfig } from '@ai-agent-platform/shared';

const REQUIRED_ENV_KEYS: Array<keyof EnvConfig> = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'JWT_SECRET',
  'OLLAMA_BASE_URL',
  'LM_STUDIO_BASE_URL',
  'OI_MODE',
  'LOCAL_OI_PROXY_URL',
  'FIRECRAWL_BASE_URL',
  'ROUTER_FREE_FIRST',
  'OPTIMIZER_CRON',
];

let cachedEnv: EnvConfig | undefined;

const bool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }
  return value === 'true' || value === '1';
};

const numberFromEnv = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getEnv = (): EnvConfig => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const env: EnvConfig = {
    SUPABASE_URL: process.env.SUPABASE_URL ?? '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? '',
    JWT_SECRET: process.env.JWT_SECRET ?? '',
    SUPABASE_ARTIFACTS_BUCKET: process.env.SUPABASE_ARTIFACTS_BUCKET ?? 'artifacts',
    SUPABASE_SIGNED_URL_TTL: numberFromEnv(process.env.SUPABASE_SIGNED_URL_TTL, 3600),
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    LM_STUDIO_BASE_URL: process.env.LM_STUDIO_BASE_URL ?? 'http://localhost:1234/v1',
    OI_MODE: process.env.OI_MODE === 'local' ? 'local' : 'cloud',
    PLAYWRIGHT_CHROMIUM_PATH: process.env.PLAYWRIGHT_CHROMIUM_PATH,
    LOCAL_OI_PROXY_URL: process.env.LOCAL_OI_PROXY_URL ?? 'http://localhost:3333',
    OPEN_INTERPRETER_API_URL: process.env.OPEN_INTERPRETER_API_URL,
    OPEN_INTERPRETER_API_KEY: process.env.OPEN_INTERPRETER_API_KEY,
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
    FIRECRAWL_BASE_URL: process.env.FIRECRAWL_BASE_URL ?? 'https://api.firecrawl.dev',
    RUBE_BASE_URL: process.env.RUBE_BASE_URL,
    RUBE_API_KEY: process.env.RUBE_API_KEY,
    RUBE_OAUTH_CLIENT_ID: process.env.RUBE_OAUTH_CLIENT_ID,
    RUBE_OAUTH_CLIENT_SECRET: process.env.RUBE_OAUTH_CLIENT_SECRET,
    VAPI_API_KEY: process.env.VAPI_API_KEY,
    VOICEFLOW_API_KEY: process.env.VOICEFLOW_API_KEY,
    ROUTER_FREE_FIRST: bool(process.env.ROUTER_FREE_FIRST, true),
    OPTIMIZER_CRON: process.env.OPTIMIZER_CRON ?? '*/30 * * * *',
  };

  for (const key of REQUIRED_ENV_KEYS) {
    const value = env[key];
    if (value === undefined || value === '') {
      throw new Error(`Missing required environment variable: ${key as string}`);
    }
  }

  cachedEnv = env;
  return env;
};
