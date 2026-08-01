import { Hono } from 'hono';
import { sql } from '../db';

const app = new Hono();
const ARCHONX_API_BASE = process.env.ARCHONX_API_BASE_URL || 'http://localhost:8000';
const ARCHONX_API_TOKEN = process.env.ARCHONX_API_TOKEN || '';

async function callArchonX(path: string, init?: RequestInit): Promise<Response> {
  const url = `${ARCHONX_API_BASE}${path}`;
  const authHeaders = ARCHONX_API_TOKEN
    ? { authorization: `Bearer ${ARCHONX_API_TOKEN}` }
    : {};
  return fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...authHeaders,
      ...(init?.headers || {}),
    },
  });
}

// POST /api/agents/run
app.post('/run', async (c) => {
  const body = await c.req.json();
  const { agentId, orgId, taskKind, input, projectId } = body;

  if (!agentId || !orgId) {
    return c.json({ error: 'Missing agentId or orgId' }, 400);
  }

  const startTime = Date.now();
  const runtimePayload = {
    type: taskKind || 'general',
    crew: body.crew || 'white',
    specialty_hint: body.specialtyHint || '',
    session_id: body.sessionId || null,
    params: {
      input,
      agentId,
      orgId,
      projectId: projectId || null,
      metadata: body.metadata || {},
    },
  };

  const runtimeRes = await callArchonX('/api/task', {
    method: 'POST',
    body: JSON.stringify(runtimePayload),
  });

  if (!runtimeRes.ok) {
    const errorText = await runtimeRes.text();
    return c.json(
      {
        error: 'Runtime execution failed',
        status: runtimeRes.status,
        details: errorText,
      },
      502,
    );
  }

  const output = await runtimeRes.json();

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
        ${JSON.stringify(output)},
        ${duration}, ${output.tokens_used || 0}, ${output.cost_usd || 0},
        ${output.model || 'archonx-kernel'}, ${'archonx'}, ${process.env.NODE_ENV || 'dev'}
      )
    `;
  } catch (error) {
    console.error('Failed to log agent run:', error);
  }

  return c.json({
    id: runId,
    agentId,
    output,
    tokensUsed: output.tokens_used || 0,
    model: output.model || 'archonx-kernel',
    duration,
    createdAt: new Date().toISOString(),
  });
});

// GET /api/agents/runtime/agents
app.get('/runtime/agents', async (c) => {
  try {
    const res = await callArchonX('/api/agents');
    const text = await res.text();
    if (!res.ok) {
      return c.json({ error: 'Failed to fetch runtime agents', details: text }, 502);
    }
    return c.body(text, 200, { 'content-type': 'application/json' });
  } catch (error) {
    console.error('Failed to fetch runtime agents:', error);
    return c.json({ error: 'Runtime unavailable' }, 503);
  }
});

// GET /api/agents/runtime/flywheel
app.get('/runtime/flywheel', async (c) => {
  try {
    const res = await callArchonX('/api/flywheel');
    const text = await res.text();
    if (!res.ok) {
      return c.json({ error: 'Failed to fetch flywheel stats', details: text }, 502);
    }
    return c.body(text, 200, { 'content-type': 'application/json' });
  } catch (error) {
    console.error('Failed to fetch flywheel stats:', error);
    return c.json({ error: 'Runtime unavailable' }, 503);
  }
});

// GET /api/agents/runtime/tasks
app.get('/runtime/tasks', async (c) => {
  try {
    const [latestRuns] = await sql`
      SELECT COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', id,
            'title', task_type,
            'state', CASE
              WHEN output_meta->>'status' = 'completed' THEN 'done'
              WHEN output_meta->>'status' = 'running' THEN 'running'
              ELSE 'queued'
            END,
            'owner', agent_id,
            'eta', 'auto',
            'tags', ARRAY[provider_used]
          )
          ORDER BY created_at DESC
        ),
        '[]'::json
      ) AS rows
      FROM (
        SELECT id, task_type, output_meta, agent_id, provider_used, created_at
        FROM agent_runs
        ORDER BY created_at DESC
        LIMIT 20
      ) r
    `;

    return c.json(latestRuns?.rows || []);
  } catch (error) {
    console.error('Failed to fetch runtime tasks:', error);
    return c.json({ error: 'Failed to fetch runtime tasks' }, 500);
  }
});

// GET /api/agents/runtime/theater
app.get('/runtime/theater', async (c) => {
  try {
    const res = await callArchonX('/api/theater/events?limit=10');
    const text = await res.text();
    if (!res.ok) {
      return c.json({ error: 'Failed to fetch theater feed', details: text }, 502);
    }
    return c.body(text, 200, { 'content-type': 'application/json' });
  } catch (error) {
    console.error('Failed to fetch theater feed:', error);
    return c.json({ error: 'Runtime unavailable' }, 503);
  }
});

// POST /api/agents/runtime/onboarding
app.post('/runtime/onboarding', async (c) => {
  try {
    const body = await c.req.json();
    const payload = {
      org_id: body.orgId || body.org_id || 'default-org',
      project_id: body.projectId || body.project_id || 'default-project',
      transcript: body.transcript || '',
    };

    const res = await callArchonX('/api/onboarding/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      return c.json({ error: 'Failed to run onboarding', details: text }, 502);
    }
    return c.body(text, 200, { 'content-type': 'application/json' });
  } catch (error) {
    console.error('Failed to run onboarding:', error);
    return c.json({ error: 'Runtime unavailable' }, 503);
  }
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
