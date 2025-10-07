import { describe, it, expect, beforeAll } from 'vitest';
import { routeLLM } from '../lib/router.js';
import type { TaskInput } from '@ai-agent-platform/shared';

beforeAll(() => {
  process.env.LOVABLE_API_URL = 'https://api.lovable.test';
  process.env.LOVABLE_API_KEY = 'key';
  process.env.LOVABLE_PROJECT_ID = 'project';
  process.env.JWT_SECRET = 'secret';
  process.env.SUPABASE_ARTIFACTS_BUCKET = 'artifacts';
  process.env.SUPABASE_SIGNED_URL_TTL = '3600';
  process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
  process.env.LM_STUDIO_BASE_URL = 'http://localhost:1234/v1';
  process.env.LOCAL_OI_PROXY_URL = 'http://localhost:3333';
  process.env.FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev';
  process.env.ROUTER_FREE_FIRST = 'true';
  process.env.OPTIMIZER_CRON = '*/30 * * * *';
});

const baseTask: TaskInput = {
  id: 'test',
  archetype: 'research',
  instructions: 'test instructions',
};

describe('routeLLM', () => {
  it('selects free providers first', async () => {
    const decision = await routeLLM(baseTask, async () => ({
      success: true,
      tokensUsed: 10,
      latencyMs: 100,
    }));
    expect(decision.provider).toBe('ollama');
    expect(decision.attempted[0].success).toBe(true);
  });

  it('escalates on failure', async () => {
    let attempt = 0;
    const decision = await routeLLM(baseTask, async () => {
      attempt += 1;
      if (attempt < 3) {
        return { success: false, tokensUsed: 0, latencyMs: 100, error: 'fail' };
      }
      return { success: true, tokensUsed: 50, latencyMs: 500 };
    });
    expect(decision.provider).toBe('openRouter');
    expect(decision.attempted.filter((a) => a.success).length).toBe(1);
  });
});

