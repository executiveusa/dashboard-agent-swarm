import { EnvConfig } from '@ai-agent-platform/shared';

const REQUIRED_ENV_KEYS: Array<keyof EnvConfig> = [
  'DATA_API_URL',
  'IDENTITY_JWT_SECRET',
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

export const getEnv = (): EnvConfig => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const env: EnvConfig = {
    DATA_API_URL:
      process.env.DATA_API_URL ??
      process.env.PERSISTENCE_API_URL ??
      'http://localhost:4000',
    DATA_API_TOKEN: process.env.DATA_API_TOKEN ?? process.env.PERSISTENCE_API_TOKEN,
    IDENTITY_JWT_SECRET: process.env.IDENTITY_JWT_SECRET ?? process.env.JWT_SECRET ?? '',
    IDENTITY_ISSUER_URL: process.env.IDENTITY_ISSUER_URL,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    LM_STUDIO_BASE_URL: process.env.LM_STUDIO_BASE_URL ?? 'http://localhost:1234/v1',
    OI_MODE: (process.env.OI_MODE === 'local' ? 'local' : 'cloud'),
    PLAYWRIGHT_CHROMIUM_PATH: process.env.PLAYWRIGHT_CHROMIUM_PATH,
    LOCAL_OI_PROXY_URL: process.env.LOCAL_OI_PROXY_URL ?? 'http://localhost:3333',
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
    FIRECRAWL_BASE_URL: process.env.FIRECRAWL_BASE_URL ?? 'https://api.firecrawl.dev',
    RUBE_BASE_URL: process.env.RUBE_BASE_URL,
    RUBE_API_KEY: process.env.RUBE_API_KEY,
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
