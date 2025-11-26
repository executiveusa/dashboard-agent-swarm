import { Hono } from 'hono';
import { sql } from '../index';

const app = new Hono();

// POST /api/agents/run
app.post('/run', async (c) => {
  const body = await c.req.json();
  const { agentId, orgId, taskKind, input, projectId } = body;

  if (!agentId || !orgId) {
    return c.json({ error: 'Missing agentId or orgId' }, 400);
  }

  const startTime = Date.now();

  // TODO: Call actual LemonAI runtime
  // For now, return mock response
  const output = {
    status: 'success',
    message: `Agent ${agentId} executed for org ${orgId}`,
    taskKind,
    input,
  };

  const duration = Date.now() - startTime;
  const runId = crypto.randomUUID();

  // Log to agent_runs table
  try {
    await sql`
      INSERT INTO agent_runs (
        id, agent_id, org_id, project_id, task_type,
        input_meta, output_meta, duration_ms, tokens_used,
        cost_usd, model_used, provider_used, env
      ) VALUES (
        ${runId}, ${agentId}, ${orgId}, ${projectId || null}, ${taskKind || 'general'},
        ${JSON.stringify({ summary: 'Input sanitized' })},
        ${JSON.stringify({ status: 'success' })},
        ${duration}, ${0}, ${0}, ${'mock-model'}, ${'mock'}, ${process.env.NODE_ENV || 'dev'}
      )
    `;
  } catch (error) {
    console.error('Failed to log agent run:', error);
  }

  return c.json({
    id: runId,
    agentId,
    output,
    tokensUsed: 0,
    model: 'mock-model',
    duration,
    createdAt: new Date().toISOString(),
  });
});

// POST /api/agents/agent-runs (for logging from frontend)
app.post('/agent-runs', async (c) => {
  const body = await c.req.json();
  const {
    agentId, orgId, projectId, taskType, inputMeta, outputMeta,
    durationMs, tokensUsed, costUsd, modelUsed, providerUsed, env
  } = body;

  if (!agentId || !orgId) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const runId = crypto.randomUUID();

  try {
    await sql`
      INSERT INTO agent_runs (
        id, agent_id, org_id, project_id, task_type,
        input_meta, output_meta, duration_ms, tokens_used,
        cost_usd, model_used, provider_used, env
      ) VALUES (
        ${runId}, ${agentId}, ${orgId}, ${projectId || null}, ${taskType || 'general'},
        ${JSON.stringify(inputMeta || {})}, ${JSON.stringify(outputMeta || {})},
        ${durationMs || 0}, ${tokensUsed || 0}, ${costUsd || 0},
        ${modelUsed || 'unknown'}, ${providerUsed || 'unknown'}, ${env || 'dev'}
      )
    `;

    return c.json({ success: true, runId });
  } catch (error) {
    console.error('Failed to log agent run:', error);
    return c.json({ error: 'Failed to log run' }, 500);
  }
});

// GET /api/agents/org-settings/:orgId
app.get('/org-settings/:orgId', async (c) => {
  const orgId = c.req.param('orgId');

  try {
    const [settings] = await sql`
      SELECT * FROM org_settings WHERE org_id = ${orgId}
    `;

    if (!settings) {
      return c.json({ error: 'Org settings not found' }, 404);
    }

    return c.json(settings);
  } catch (error) {
    console.error('Failed to fetch org settings:', error);
    return c.json({ error: 'Failed to fetch settings' }, 500);
  }
});

export { app as agentRoutes };
