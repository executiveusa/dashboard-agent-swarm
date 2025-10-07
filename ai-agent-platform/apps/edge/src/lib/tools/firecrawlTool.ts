import { z } from 'zod';
import { getEnv } from '../env.js';

const firecrawlSchema = z.object({
  instruction: z.string().min(1),
  url: z.string().url().optional(),
  mode: z.enum(['crawl', 'scrape', 'sitemap']).default('crawl'),
});

export type FirecrawlInput = z.infer<typeof firecrawlSchema>;

const inferMode = (instruction: string, fallback: FirecrawlInput['mode']): FirecrawlInput['mode'] => {
  const text = instruction.toLowerCase();
  if (text.includes('sitemap')) return 'sitemap';
  if (text.includes('scrape')) return 'scrape';
  return fallback;
};

export const firecrawlTool = {
  name: 'FirecrawlTool',
  async execute(input: FirecrawlInput) {
    const env = getEnv();
    if (!env.FIRECRAWL_API_KEY || !env.FIRECRAWL_BASE_URL) {
      throw new Error('Firecrawl credentials missing');
    }

    const payload = firecrawlSchema.parse({
      ...input,
      mode: inferMode(input.instruction, input.mode ?? 'crawl'),
    });

    const plan = {
      steps: [
        {
          action: payload.mode,
          target: payload.url,
          instruction: payload.instruction,
        },
      ],
    };

    const response = await fetch(`${env.FIRECRAWL_BASE_URL}/v1/${payload.mode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({ instruction: payload.instruction, url: payload.url }),
    });

    if (!response.ok) {
      throw new Error(`Firecrawl request failed: ${response.status}`);
    }

    const data = (await response.json()) as { result?: unknown; provenance?: unknown };
    return {
      plan,
      result: data.result,
      provenance: data.provenance ?? { url: payload.url, mode: payload.mode },
    };
  },
};

