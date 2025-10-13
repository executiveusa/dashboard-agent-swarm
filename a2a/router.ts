import { randomUUID } from 'node:crypto';
import type { A2AEnvelope } from '../packages/sdk/src/a2a/envelope';
import { A2AEnvelopeSchema } from '../packages/sdk/src/a2a/envelope';
import type { AgentManifest } from '../agents/types';

export type PublishFn = (event: string, envelope: A2AEnvelope) => Promise<void>;

export interface RouterOptions {
  agent: AgentManifest;
  publish: PublishFn;
  onEnvelope?: (envelope: A2AEnvelope) => Promise<void> | void;
}

export class LemonRouter {
  constructor(private readonly options: RouterOptions) {}

  async dispatch(envelope: Partial<A2AEnvelope>) {
    const message: A2AEnvelope = A2AEnvelopeSchema.parse({
      id: envelope.id ?? randomUUID(),
      ts: envelope.ts ?? new Date().toISOString(),
      from: envelope.from ?? this.options.agent.slug,
      to: envelope.to,
      type: envelope.type ?? 'task.create',
      body: envelope.body ?? {},
      corr: envelope.corr,
      trace: envelope.trace,
      policy: envelope.policy,
    });

    await this.options.publish(message.type, message);
    await this.options.onEnvelope?.(message);
  }
}
