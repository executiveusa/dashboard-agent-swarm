import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAuditLogger } from '../../lib/audit.js';

const eventSchema = z.object({
  sessionId: z.string(),
  status: z.enum(['started', 'progress', 'completed', 'error']),
  detail: z.record(z.any()).optional(),
});

export const handler = async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const event = eventSchema.parse(await req.json());
  const audit = createAuditLogger({ sessionId: event.sessionId, requestId: randomUUID() });
  const log = audit.newEvent('oi_event', `Open Interpreter ${event.status}`, {
    detail: event.detail,
  });
  await audit.record(log);

  if (audit.recordStructured) {
    await audit.recordStructured({
      category: 'workflow',
      name: 'OpenInterpreter',
      action: event.status === 'error' ? 'error' : 'finish',
      sessionId: event.sessionId,
      metadata: {
        status: event.status,
        detail: event.detail,
      },
    });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};

