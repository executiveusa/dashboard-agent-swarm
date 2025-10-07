import { z } from 'zod';
import { getSupabaseClient } from '../../lib/db.js';
import { parseWorkflow } from '../../lib/workflows.js';
import { runWorkflowWithRecording } from './runner.js';

const requestSchema = z.object({
  workflowName: z.string().optional(),
  definition: z.string().optional(),
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
  const definition = await resolveWorkflowDefinition(payload.workflowName, payload.definition);

  const execution = await runWorkflowWithRecording({
    definition,
    trigger: payload.trigger,
    inputs: payload.inputs,
    workflowSlug: payload.workflowName,
  });

  return new Response(JSON.stringify(execution), {
    headers: { 'Content-Type': 'application/json' },
  });
};

const resolveWorkflowDefinition = async (name?: string, inline?: string) => {
  if (inline) {
    return parseWorkflow(inline);
  }
  if (!name) {
    throw new Error('workflowName or definition required');
  }
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('workflows')
    .select('definition')
    .eq('name', name)
    .maybeSingle();
  if (error || !data?.definition) {
    throw new Error(`Workflow ${name} not found`);
  }
  return parseWorkflow(data.definition);
};
