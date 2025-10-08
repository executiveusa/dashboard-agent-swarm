import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { runTask } from '../../lib/eigent.js';
import { getEnv } from '../../lib/env.js';
import { createAuditLogger } from '../../lib/audit.js';
import { createRateLimiter } from '../../lib/rateLimit.js';
import { createTaskLifecycle } from '../../lib/taskLifecycle.js';
import type { AgentContext, TaskInput } from '@ai-agent-platform/shared';

const vapiSchema = z.object({
  session: z.string(),
  text: z.string().min(1),
  userId: z.string().optional(),
});

const limiter = createRateLimiter({ tokensPerInterval: 30, intervalMs: 60_000 });

export const handler = async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const payload = vapiSchema.parse(await req.json());
  const env = getEnv();
  const requestId = randomUUID();
  const audit = createAuditLogger({ sessionId: payload.session, requestId });

  const context: AgentContext = {
    userId: payload.userId,
    requestId,
    sessionId: payload.session,
    env,
    logger: {
      info: (message, meta) => console.info(`[vapi:${requestId}] ${message}`, meta),
      warn: (message, meta) => console.warn(`[vapi:${requestId}] ${message}`, meta),
      error: (message, meta) => console.error(`[vapi:${requestId}] ${message}`, meta),
    },
    rateLimit: {
      consume: async (tokens) => limiter.consume(payload.session, tokens),
    },
    audit,
  };

  const task: TaskInput = {
    id: requestId,
    archetype: 'voice',
    instructions: payload.text,
    metadata: { source: 'vapi' },
  };

  const lifecycle = createTaskLifecycle({
    id: requestId,
    taskType: task.archetype,
    sessionId: payload.session,
    userId: payload.userId,
    metadata: task.metadata,
  });

  await lifecycle.start({ source: 'vapi' });

  try {
    const result = await runTask(task, context);
    await lifecycle.complete('completed', { output: result.output, steps: result.steps });
    return new Response(JSON.stringify({ result }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    await lifecycle.complete('failed', { error: (error as Error).message });
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  const event = audit.newEvent('vapi_request', 'Vapi webhook received', { session: payload.session });
  await audit.record(event);

  try {
    const result = await runTask(task, context);
    if (audit.recordStructured) {
      await audit.recordStructured({
        category: 'agent',
        name: 'VoiceAgent',
        action: 'finish',
        requestId,
        sessionId: payload.session,
        metadata: { source: 'vapi' },
      });
    }
    return new Response(JSON.stringify({ result }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    if (audit.recordStructured) {
      await audit.recordStructured({
        category: 'agent',
        name: 'VoiceAgent',
        action: 'error',
        requestId,
        sessionId: payload.session,
        metadata: { source: 'vapi', error: (error as Error).message },
      });
    }
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

