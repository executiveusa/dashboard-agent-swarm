import { createHash } from 'node:crypto';
import type { A2AEnvelope } from '../../packages/sdk/src/a2a/envelope';
import { A2AEnvelopeSchema } from '../../packages/sdk/src/a2a/envelope';

export interface RedisStreamEntry {
  id: string;
  fields: string[];
}

export interface RedisClient {
  xadd(stream: string, id: string, field: string, value: string): Promise<string>;
  xread(
    ...args: (string | number)[]
  ): Promise<Array<[string, Array<[string, string[]]>]>> | null;
}

export interface RedisA2AAdapterOptions {
  client: RedisClient;
  environment: string;
  agentId: string;
  onMessage: (message: A2AEnvelope) => Promise<void> | void;
  dedupe?: (id: string) => Promise<boolean> | boolean;
  blockTimeoutMs?: number;
}

export class RedisA2AAdapter {
  private readonly stream: string;
  private listenerActive = false;

  constructor(private readonly options: RedisA2AAdapterOptions) {
    this.stream = `a2a:${options.environment}:${options.agentId}:events`;
  }

  async publish(event: string, envelope: A2AEnvelope) {
    const parsed = A2AEnvelopeSchema.parse(envelope);
    await this.options.client.xadd(
      `${this.stream}:${event}`,
      '*',
      'payload',
      JSON.stringify(parsed),
    );
  }

  async start() {
    this.listenerActive = true;
    const streamKey = `${this.stream}:*`;

    while (this.listenerActive) {
      const data = await this.options.client.xread(
        'BLOCK',
        this.options.blockTimeoutMs ?? 1000,
        'STREAMS',
        streamKey,
        '$',
      );

      if (!data) {
        continue;
      }

      for (const [, entries] of data) {
        for (const [, [, payload]]] of entries) {
          try {
            const json = JSON.parse(payload);
            const envelope = A2AEnvelopeSchema.parse(json);
            const dedupeKey = this.hashId(envelope.id);
            if (this.options.dedupe && !(await this.options.dedupe(dedupeKey))) {
              continue;
            }
            await this.options.onMessage(envelope);
          } catch (error) {
            console.error('Redis A2A adapter failed to parse payload', error);
          }
        }
      }
    }
  }

  stop() {
    this.listenerActive = false;
  }

  private hashId(id: string) {
    return createHash('sha256').update(id).digest('hex');
  }
}
