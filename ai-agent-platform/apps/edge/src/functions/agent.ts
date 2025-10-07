import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { runTask } from '../lib/eigent.js';
import { getEnv } from '../lib/env.js';
import { createAuditLogger } from '../lib/audit.js';
import { createRateLimiter } from '../lib/rateLimit.js';
import type { AgentContext, TaskInput } from '@ai-agent-platform/shared';

const requestSchema = z.object({
  userId: z.string().optional(),
  input: z.object({
    archetype: z.enum(['research', 'coding', 'automation', 'data-cleaning', 'voice', 'general']).default('general'),
    instructions: z.string().min(1),
    metadata: z.record(z.any()).optional(),
    attachments: z
      .array(
        z.object({
          name: z.string(),
          type: z.string(),
          url: z.string().url().optional(),
          content: z.string().optional(),
        })
      )
      .optional(),
    fanOut: z.array(z.record(z.any())).optional(),
    parallel: z.boolean().optional(),
  }),
  stream: z.boolean().optional(),
});

const limiter = createRateLimiter({ tokensPerInterval: 60, intervalMs: 60_000 });
const encoder = new TextEncoder();

export const handler = async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = requestSchema.parse(await req.json());
  const env = getEnv();
  const requestId = randomUUID();
  const sessionId = body.userId ?? randomUUID();
  const audit = createAuditLogger({ sessionId });

  const context: AgentContext = {
    userId: body.userId,
    requestId,
    sessionId,
    env,
    logger: {
      info: (message, meta) => console.info(`[agent:${requestId}] ${message}`, meta),
      warn: (message, meta) => console.warn(`[agent:${requestId}] ${message}`, meta),
      error: (message, meta) => console.error(`[agent:${requestId}] ${message}`, meta),
    },
    rateLimit: {
      consume: async (tokens: number) => limiter.consume(sessionId, tokens),
    },
    audit,
  };

  const buildTask = (input: typeof body.input, index = 0): TaskInput => ({
    id: `${requestId}-${index}`,
    archetype: input.archetype,
    instructions: input.instructions,
    metadata: input.metadata ?? {},
    attachments: input.attachments,
  });

  if (body.stream) {
    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        controller.enqueue(formatSse({ event: 'open', data: { requestId } }));
        try {
          const result = await runTask(buildTask(body.input), context, {
            fanOut: body.input.fanOut?.map((item, idx) => buildTask({ ...body.input, ...item }, idx + 1)),
            parallel: body.input.parallel,
          });
          controller.enqueue(formatSse({ event: 'result', data: result }));
          controller.enqueue(formatSse({ event: 'close', data: { requestId } }));
          controller.close();
        } catch (error) {
          controller.enqueue(
            formatSse({ event: 'error', data: { message: (error as Error).message, requestId } })
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  try {
    const result = await runTask(buildTask(body.input), context, {
      fanOut: body.input.fanOut?.map((item, idx) => buildTask({ ...body.input, ...item }, idx + 1)),
      parallel: body.input.parallel,
    });
    return new Response(JSON.stringify({ requestId, result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message, requestId }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

const formatSse = ({ event, data }: { event: string; data: unknown }): Uint8Array =>
  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

