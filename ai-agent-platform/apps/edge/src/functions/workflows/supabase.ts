import { z } from 'zod';
import { loadWorkflowFromSlug, runWorkflowWithRecording } from './runner.js';

const requestSchema = z.object({
  workflow: z.string(),
  trigger: z.object({
    type: z.enum(['cron', 'webhook', 'storage', 'manual', 'scheduled']),
    payload: z.record(z.any()).optional(),
  }),
  inputs: z.record(z.any()).optional(),
});

export const handler = async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const payload = requestSchema.parse(await req.json());
  const { definition, slug } = await loadWorkflowFromSlug(payload.workflow);

  try {
    const execution = await runWorkflowWithRecording({
      definition,
      workflowSlug: slug,
      trigger: payload.trigger,
      inputs: payload.inputs ?? (payload.trigger.payload as Record<string, unknown> | undefined),
    });

    return new Response(JSON.stringify(execution), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Workflow execution failed';
    return new Response(JSON.stringify({ error: message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
};
