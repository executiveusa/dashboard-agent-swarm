import { z } from 'zod';

const requestSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  timeoutMs: z.number().int().positive().max(30000).default(10000),
});

export type HttpToolInput = z.infer<typeof requestSchema>;

export const httpTool = {
  name: 'HTTPTool',
  async execute(input: HttpToolInput) {
    const payload = requestSchema.parse(input);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), payload.timeoutMs);
    try {
      const response = await fetch(payload.url, {
        method: payload.method,
        headers: payload.headers,
        body: payload.body,
        signal: controller.signal,
      });
      const text = await response.text();
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: text,
      };
    } finally {
      clearTimeout(timer);
    }
  },
};

