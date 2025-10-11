import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { runTask } from '../../lib/eigent.js';
import { getEnv } from '../../lib/env.js';
import { createAuditLogger } from '../../lib/audit.js';
import { createTaskLifecycle } from '../../lib/taskLifecycle.js';
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
  const audit = createAuditLogger({ sessionId, requestId });

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

  const lifecycle = createTaskLifecycle({
    id: requestId,
    taskType: task.archetype,
    sessionId,
    userId: body.request.payload.userId,
    metadata: task.metadata,
  });

  await lifecycle.start({ source: 'voiceflow' });

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
  const event = audit.newEvent('voiceflow_request', 'Voiceflow webhook received', {
    sessionId,
  });
  await audit.record(event);

  try {
    const result = await runTask(task, context);
    if (audit.recordStructured) {
      await audit.recordStructured({
        category: 'agent',
        name: 'VoiceAgent',
        action: 'finish',
        requestId,
        sessionId,
        metadata: { source: 'voiceflow' },
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
        sessionId,
        metadata: { source: 'voiceflow', error: (error as Error).message },
      });
    }
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

