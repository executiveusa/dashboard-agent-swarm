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

      if (!data) continue;

      for (const [, entries] of data) {
        for (const entry of entries) {
          await this.handleEntry(entry);
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

  /**
   * Process one Redis stream entry.
   *
   * Entry shape: `[id, [fieldName, fieldValue, ...]]`. We published with
   * field name `'payload'`, so the JSON envelope lives at fields index 1.
   */
  private async handleEntry(entry: [string, string[]]) {
    const [, fields] = entry;
    const payload = fields[1];
    if (!payload) return;

    try {
      const envelope = A2AEnvelopeSchema.parse(JSON.parse(payload));
      if (this.options.dedupe) {
        const dedupeKey = this.hashId(envelope.id);
        if (!(await this.options.dedupe(dedupeKey))) return;
      }
      await this.options.onMessage(envelope);
    } catch (error) {
      console.error('Redis A2A adapter failed to parse payload', error);
    }
  }
}
