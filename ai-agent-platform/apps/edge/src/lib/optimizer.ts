import cronParser from 'cron-parser';
import { OptimizerEntry, OptimizerCacheKey } from '@ai-agent-platform/shared';
import { getEnv } from './env.js';

interface RecordInput extends OptimizerCacheKey {
  provider: OptimizerEntry['provider'];
  model: string;
  success: boolean;
  latencyMs: number;
}

class Optimizer {
  private cache = new Map<string, OptimizerEntry>();
  private timer?: NodeJS.Timeout;

  constructor() {
    this.schedule();
  }

  private key(input: OptimizerCacheKey): string {
    return `${input.archetype}:${input.tool ?? 'none'}`;
  }

  suggest(input: OptimizerCacheKey): OptimizerEntry | undefined {
    const entry = this.cache.get(this.key(input));
    return entry;
  }

  record(input: RecordInput): void {
    const current = this.cache.get(this.key(input));
    const scoreDelta = input.success ? Math.max(0.1, 5000 / Math.max(input.latencyMs, 1)) : -100;
    const now = Date.now();
    const nextScore = current ? current.score * 0.7 + scoreDelta * 0.3 : scoreDelta;
    this.cache.set(this.key(input), {
      provider: input.provider,
      model: input.model,
      score: nextScore,
      updatedAt: now,
    });
  }

  private schedule(): void {
    const env = getEnv();
    const interval = cronParser.parseExpression(env.OPTIMIZER_CRON, { currentDate: new Date() });
    const msUntilNext = interval.next().getTime() - Date.now();
    if (Number.isFinite(msUntilNext) && msUntilNext > 0) {
      this.timer = setTimeout(() => {
        void this.runBenchmarks().finally(() => this.schedule());
      }, msUntilNext);
    }
  }

  private async runBenchmarks(): Promise<void> {
    const env = getEnv();
    const syntheticTasks: OptimizerCacheKey[] = [
      { archetype: 'research', tool: 'BrowserTool' },
      { archetype: 'coding', tool: 'CodeTool' },
      { archetype: 'automation', tool: 'RubeTool' },
    ];
    for (const task of syntheticTasks) {
      const entry = this.cache.get(this.key(task));
      if (!entry) {
        // Seed with free model preference when no history exists.
        this.cache.set(this.key(task), {
          provider: 'ollama',
          model: 'llama3',
          score: 100,
          updatedAt: Date.now(),
        });
      } else if (Date.now() - entry.updatedAt > 1000 * 60 * 60) {
        // decay old scores to force re-evaluation
        entry.score *= 0.8;
        entry.updatedAt = Date.now();
        this.cache.set(this.key(task), entry);
      }
    }
  }
}

export const optimizer = new Optimizer();
