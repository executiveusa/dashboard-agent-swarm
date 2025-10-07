import { TaskInput, type RouterDecision, type LLMProvider, type ToolName } from '@ai-agent-platform/shared';
import { getEnv } from './env.js';
import { optimizer } from './optimizer.js';

export interface RouteOptions {
  requiredTools?: ToolName[];
  maxLatencyMs?: number;
}

export interface RouteAttemptResult {
  success: boolean;
  tokensUsed?: number;
  latencyMs: number;
  error?: string;
}

export type RouteExecutor = (
  provider: LLMProvider,
  model: string
) => Promise<RouteAttemptResult>;

interface ProviderConfig {
  provider: LLMProvider;
  model: string;
  available: boolean;
  costEstimate: number;
  baseLatency: number;
}

const defaultModels: Record<LLMProvider, string> = {
  ollama: 'llama3',
  lmStudio: 'lmstudio-community/Qwen2.5-Coder',
  openRouter: 'openrouter/anthropic/claude-3-haiku',
  paidFallback: 'openai/gpt-4o-mini',
};

const baseCosts: Record<LLMProvider, number> = {
  ollama: 0,
  lmStudio: 0,
  openRouter: 0.002,
  paidFallback: 0.03,
};

const baseLatencies: Record<LLMProvider, number> = {
  ollama: 1200,
  lmStudio: 1400,
  openRouter: 1800,
  paidFallback: 2100,
};

export const routeLLM = async (
  task: TaskInput,
  executor: RouteExecutor,
  options: RouteOptions = {}
): Promise<RouterDecision> => {
  const env = getEnv();
  const providerOrder: LLMProvider[] = env.ROUTER_FREE_FIRST
    ? ['ollama', 'lmStudio', 'openRouter', 'paidFallback']
    : ['openRouter', 'paidFallback', 'ollama', 'lmStudio'];

  const configs: ProviderConfig[] = providerOrder.map((provider) => {
    const optimized = optimizer.suggest({ archetype: task.archetype, tool: options.requiredTools?.[0] });
    const model = optimized?.provider === provider ? optimized.model : defaultModels[provider];
    const available = isProviderAvailable(provider, env);
    const costEstimate = baseCosts[provider];
    const baseLatency = baseLatencies[provider];
    return { provider, model, available, costEstimate, baseLatency };
  });

  const attempted: RouterDecision['attempted'] = [];
  let lastError: string | undefined;

  for (const cfg of configs) {
    if (!cfg.available) {
      attempted.push({
        provider: cfg.provider,
        model: cfg.model,
        success: false,
        latencyMs: 0,
        error: 'provider_unavailable',
      });
      continue;
    }

    const result = await executor(cfg.provider, cfg.model);
    attempted.push({
      provider: cfg.provider,
      model: cfg.model,
      success: result.success,
      latencyMs: result.latencyMs,
      tokensUsed: result.tokensUsed,
      error: result.error,
    });

    optimizer.record({
      archetype: task.archetype,
      tool: options.requiredTools?.[0],
      provider: cfg.provider,
      model: cfg.model,
      success: result.success,
      latencyMs: result.latencyMs,
    });

    if (result.success) {
      return {
        provider: cfg.provider,
        model: cfg.model,
        reason: buildReason(task, cfg, options),
        costEstimate: cfg.costEstimate,
        attempted,
      };
    }

    lastError = result.error ?? 'unknown_failure';
  }

  throw new Error(`All language model providers failed. Last error: ${lastError ?? 'n/a'}`);
};

const buildReason = (task: TaskInput, cfg: ProviderConfig, options: RouteOptions): string => {
  const parts: string[] = [`archetype=${task.archetype}`, `model=${cfg.model}`];
  if (options.requiredTools?.length) {
    parts.push(`tools=${options.requiredTools.join(',')}`);
  }
  parts.push(`latency=${cfg.baseLatency}ms`);
  parts.push(`cost=${cfg.costEstimate}`);
  return parts.join(' | ');
};

const isProviderAvailable = (provider: LLMProvider, env: ReturnType<typeof getEnv>): boolean => {
  switch (provider) {
    case 'ollama':
      return Boolean(env.OLLAMA_BASE_URL);
    case 'lmStudio':
      return Boolean(env.LM_STUDIO_BASE_URL);
    case 'openRouter':
      return Boolean(env.OPENROUTER_API_KEY);
    case 'paidFallback':
      return Boolean(env.OPENAI_API_KEY);
    default:
      return false;
  }
};
