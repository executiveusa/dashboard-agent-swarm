import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { AgentStreamEvent } from '@ai-agent-platform/shared';

interface StoredEvent {
  event: string;
  data: AgentStreamEvent | Record<string, unknown>;
}

interface TranscriptPayload {
  requestId?: string;
  input?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export class TranscriptSession {
  private requestId: string;
  private readonly startedAt = new Date().toISOString();
  private readonly events: StoredEvent[] = [];

  constructor(
    private readonly directory: string,
    private readonly initialPayload: TranscriptPayload
  ) {
    this.requestId = initialPayload.requestId ?? randomUUID();
  }

  setRequestId(id: string) {
    this.requestId = id;
  }

  getRequestId() {
    return this.requestId;
  }

  append(event: string, data: AgentStreamEvent | Record<string, unknown>) {
    this.events.push({ event, data });
  }

  async finalize(): Promise<string> {
    const filePath = path.join(
      this.directory,
      `${this.startedAt.replace(/[:.]/g, '-')}-${this.requestId}.json`
    );
    const record = {
      requestId: this.requestId,
      createdAt: this.startedAt,
      input: this.initialPayload,
      events: this.events,
    } satisfies {
      requestId: string;
      createdAt: string;
      input: TranscriptPayload;
      events: StoredEvent[];
    };
    await mkdir(this.directory, { recursive: true });
    await writeFile(filePath, JSON.stringify(record, null, 2), 'utf8');
    return filePath;
  }
}

export class TranscriptStore {
  private readonly directory: string;

  constructor(rootDir?: string) {
    this.directory = rootDir ?? path.join(os.homedir(), '.desktop-agent', 'transcripts');
  }

  createSession(payload: TranscriptPayload): TranscriptSession {
    return new TranscriptSession(this.directory, payload);
  }
}
