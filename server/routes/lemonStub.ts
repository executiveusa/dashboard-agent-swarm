import { Hono } from 'hono';

const app = new Hono();

// POST /lemonai/run - LemonAI stub for development
app.post('/run', async (c) => {
  const body = await c.req.json();
  const { agent_id, org_id, task_type, input, context } = body;

  if (!agent_id || !org_id) {
    return c.json({ error: 'Missing agent_id or org_id' }, 400);
  }

  console.log(`[LemonAI Stub] Running agent: ${agent_id} for org: ${org_id}, task: ${task_type}`);

  // TODO: In real implementation, this would:
  // 1. Load agent config from /agents directory
  // 2. Call safeLlmCall with agent's system prompt
  // 3. Return structured output

  // For now, return mock response
  const output = {
    status: 'success',
    agent: agent_id,
    task: task_type,
    result: {
      message: `Mock response from ${agent_id}`,
      data: input,
      context_used: !!context,
    },
  };

  const meta = {
    agent_id,
    org_id,
    task_type,
    model: 'gpt-4o-mini',
    provider: 'openai',
    tokens_used: 150,
    cost: 0.0001,
    duration_ms: 500,
  };

  return c.json({ output, meta });
});

export { app as lemonStubRoutes };
