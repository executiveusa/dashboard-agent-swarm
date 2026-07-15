import { Hono } from 'hono';

export const lemonStubRoutes = new Hono();

interface LemonRunRequest {
  agent?: string;
  prompt?: string;
  task?: string;
  context?: Record<string, unknown>;
}

lemonStubRoutes.post('/run', async (c) => {
  const body = await c.req.json<LemonRunRequest>();
  const prompt = body.prompt ?? body.task ?? 'Hello';
  const agentName = body.agent ?? 'Agent Zero';

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const startMs = Date.now();

  if (!apiKey) {
    // Mock mode when no API key
    return c.json({
      success: true,
      agent: agentName,
      result: `[MOCK] Agent ${agentName} processed: "${prompt.slice(0, 100)}"`,
      model: 'claude-haiku-4-5',
      tokens_used: 0,
      cost: 0,
      duration_ms: Date.now() - startMs,
      mock: true,
    });
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 500,
        system: `You are ${agentName}, an AI agent in the Archon-X ecosystem. Respond concisely and helpfully.`,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
    const data = await res.json() as {
      content: [{ text: string }];
      usage: { input_tokens: number; output_tokens: number };
    };
    const totalTokens = (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0);

    return c.json({
      success: true,
      agent: agentName,
      result: data.content[0].text,
      model: 'claude-haiku-4-5',
      tokens_used: totalTokens,
      cost: totalTokens * 0.000001,
      duration_ms: Date.now() - startMs,
      mock: false,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: msg, agent: agentName }, 500);
  }
});
