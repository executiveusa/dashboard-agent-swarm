import { z } from 'zod';

export const envelopeTypes = [
  'task.create',
  'task.update',
  'task.result',
  'ask',
  'tell',
  'tool.call',
  'tool.result',
  'error',
] as const;

export const A2AEnvelopeSchema = z.object({
  id: z.string(),
  ts: z.string().datetime(),
  trace: z.string().optional(),
  from: z.string(),
  to: z.string(),
  type: z.enum(envelopeTypes),
  corr: z.string().optional(),
  body: z.record(z.any()),
  policy: z.record(z.any()).optional(),
});

export type A2AEnvelope = z.infer<typeof A2AEnvelopeSchema>;

export const createEnvelope = (input: A2AEnvelope) => A2AEnvelopeSchema.parse(input);
