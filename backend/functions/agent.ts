import { withEdgeLogging, EdgeHandler } from '@lovable/edge-sdk';
import { createClient } from '@supabase/supabase-js';
import { AgentRouter } from '../agents/router';
import { loadWorkflow } from '../../shared/workflows/runner';
import { z } from 'zod';

const requestSchema = z.object({
  goal: z.string(),
  context: z.record(z.unknown()).optional(),
  workflow: z.string().optional()
});

const routerEnvKeys = [
  'EIGENT_API_KEY',
  'EIGENT_ENDPOINT',
  'LEMON_API_KEY',
  'RUBE_API_URL',
  'RUBE_API_KEY',
  'DEFAULT_WORKFLOW'
] as const;

type SupabaseLogPayload = {
  request_id: string;
  step_id: string;
  role: string;
  output: string;
  success: boolean;
  metadata?: Record<string, unknown>;
};

function getRouterEnvironment(secrets: Record<string, string>) {
  const mapped: Record<string, string | undefined> = {};

  routerEnvKeys.forEach((key) => {
    mapped[key] = secrets[key];
  });

  if (!mapped.EIGENT_API_KEY || !mapped.LEMON_API_KEY || !mapped.RUBE_API_URL) {
    throw new Error('Missing required router environment secrets.');
  }

  return {
    eigentApiKey: mapped.EIGENT_API_KEY,
    eigentEndpoint: mapped.EIGENT_ENDPOINT,
    lemonApiKey: mapped.LEMON_API_KEY,
    rubeApiUrl: mapped.RUBE_API_URL,
    rubeApiKey: mapped.RUBE_API_KEY,
    defaultWorkflow: mapped.DEFAULT_WORKFLOW
  };
}

async function persistTask(
  supabaseUrl: string,
  supabaseKey: string,
  requestId: string,
  goal: string,
  workflow: string,
  results: SupabaseLogPayload[]
) {
  const client = createClient(supabaseUrl, supabaseKey);

  await client.from('tasks').upsert(
    {
      request_id: requestId,
      goal,
      workflow,
      status: 'completed'
    },
    { onConflict: 'request_id' }
  );

  if (results.length > 0) {
    await client.from('logs').insert(results.map((log) => ({
      request_id: log.request_id,
      step_id: log.step_id,
      role: log.role,
      output: log.output,
      success: log.success,
      metadata: log.metadata ?? {},
      created_at: new Date().toISOString()
    })));
  }
}

const handler: EdgeHandler = withEdgeLogging(async (request, context) => {
  try {
    const payload = requestSchema.parse(await request.json());
    const environment = getRouterEnvironment(context.secrets);

    const supabaseUrl = context.secrets['SUPABASE_URL'];
    const supabaseKey = context.secrets['SUPABASE_SERVICE_ROLE_KEY'] ?? context.secrets['SUPABASE_ANON_KEY'];

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials.');
    }

    const router = new AgentRouter(environment);
    const workflowDefinition = await loadWorkflow(payload.workflow ?? environment.defaultWorkflow ?? 'default');

    const response = await router.route({
      goal: payload.goal,
      context: payload.context,
      workflow: workflowDefinition.id
    });

    const logs: SupabaseLogPayload[] = response.results.map((result) => ({
      request_id: response.requestId,
      step_id: result.id,
      role: result.role,
      output: result.output,
      success: result.success,
      metadata: result.artifacts
    }));

    await persistTask(supabaseUrl, supabaseKey, response.requestId, payload.goal, response.workflow, logs);

    return new Response(
      JSON.stringify({
        requestId: response.requestId,
        workflow: response.workflow,
        transcript: response.transcript,
        results: response.results
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({
        error: message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
});

export default handler;
