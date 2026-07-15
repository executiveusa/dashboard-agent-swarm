import { createHash } from 'node:crypto';
import type { A2AEnvelope } from '../../packages/sdk/src/a2a/envelope';
import { A2AEnvelopeSchema } from '../../packages/sdk/src/a2a/envelope';

export interface Msg {
  data?: Uint8Array;
}

export interface Subscription {
  drain(): Promise<void>;
}

export interface NatsConnection {
  subscribe(
    subject: string,
    handler: {
      callback: (err: unknown, msg: Msg) => void;
    },
  ): Subscription;
  publish(subject: string, payload: Uint8Array): Promise<void>;
}

export interface NatsA2AAdapterOptions {
  connection: NatsConnection;
  environment: string;
  agentId: string;
  onMessage: (message: A2AEnvelope) => Promise<void> | void;
  dedupe?: (id: string) => Promise<boolean> | boolean;
}

export class NatsA2AAdapter {
  private readonly subjectPrefix: string;
  private subscription?: Subscription;

  constructor(private readonly options: NatsA2AAdapterOptions) {
    this.subjectPrefix = `a2a.${options.environment}.${options.agentId}`;
  }

  async start() {
    const subject = `${this.subjectPrefix}.*`;
    this.subscription = this.options.connection.subscribe(subject, {
      callback: async (err, msg) => {
        if (err) {
          console.error('NATS subscription error', err);
          return;
        }

        try {
          const envelope = this.parseMessage(msg);
          const dedupeKey = this.hashId(envelope.id);
          if (this.options.dedupe && !(await this.options.dedupe(dedupeKey))) {
            return;
          }
          await this.options.onMessage(envelope);
        } catch (parseErr) {
          console.error('Failed to handle A2A message', parseErr);
        }
      },
    });
  }

  async stop() {
    await this.subscription?.drain();
    this.subscription = undefined;
  }

  async publish(event: string, envelope: A2AEnvelope) {
    const parsed = A2AEnvelopeSchema.parse(envelope);
    const subject = `${this.subjectPrefix}.${event}`;
    const payload = new TextEncoder().encode(JSON.stringify(parsed));
    await this.options.connection.publish(subject, payload);
  }

  private parseMessage(msg: Msg): A2AEnvelope {
    const payload = msg.data ? new TextDecoder().decode(msg.data) : '{}';
    const json = JSON.parse(payload);
    return A2AEnvelopeSchema.parse(json);
  }

  private hashId(id: string) {
    return createHash('sha256').update(id).digest('hex');
  }
}
