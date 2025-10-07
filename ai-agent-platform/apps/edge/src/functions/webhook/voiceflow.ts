import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { runTask } from '../../lib/eigent.js';
import { getEnv } from '../../lib/env.js';
import { createAuditLogger } from '../../lib/audit.js';
import type { AgentContext, TaskInput } from '@ai-agent-platform/shared';

const voiceflowSchema = z.object({
  request: z.object({
    payload: z.object({
      text: z.string().min(1),
      userId: z.string().optional(),
    }),
    session: z.object({ sessionId: z.string() }),
  }),
});

export const handler = async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = voiceflowSchema.parse(await req.json());
  const requestId = randomUUID();
  const env = getEnv();
  const sessionId = body.request.session.sessionId;
  const audit = createAuditLogger({ sessionId });

  const context: AgentContext = {
    userId: body.request.payload.userId,
    requestId,
    sessionId,
    env,
    logger: {
      info: (message, meta) => console.info(`[voiceflow:${requestId}] ${message}`, meta),
      warn: (message, meta) => console.warn(`[voiceflow:${requestId}] ${message}`, meta),
      error: (message, meta) => console.error(`[voiceflow:${requestId}] ${message}`, meta),
    },
    audit,
  };

  const task: TaskInput = {
    id: requestId,
    archetype: 'voice',
    instructions: body.request.payload.text,
    metadata: { source: 'voiceflow' },
  };

  const result = await runTask(task, context);
  return new Response(JSON.stringify({ result }), { headers: { 'Content-Type': 'application/json' } });
};

