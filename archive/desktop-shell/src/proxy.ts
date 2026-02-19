import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { TextDecoder } from 'node:util';
import type { AgentStreamEvent } from '@ai-agent-platform/shared';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { TranscriptStore, TranscriptSession } from './transcriptStore.js';

const decoder = new TextDecoder();

interface ParsedSseEvent {
  event: string;
  data: any;
}

const parseSseSegment = (segment: string): ParsedSseEvent | null => {
  const lines = segment.split('\n');
  let eventName: string | null = null;
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (!eventName) return null;
  const payload = dataLines.join('');
  if (!payload) {
    return { event: eventName, data: undefined };
  }
  try {
    return { event: eventName, data: JSON.parse(payload) };
  } catch (error) {
    console.warn('Failed to parse SSE data', error);
    return { event: eventName, data: payload };
  }
};

const toStreamEvent = (event: string, data: any): AgentStreamEvent | null => {
  const timestamp = data?.timestamp ?? new Date().toISOString();
  switch (event) {
    case 'status':
      if (!data?.status) return null;
      return {
        type: 'status',
        status: data.status,
        message: data.message,
        progress: typeof data.progress === 'number' ? data.progress : undefined,
        timestamp,
      };
    case 'tool':
      if (!data?.tool || !data?.status) return null;
      return {
        type: 'tool',
        tool: data.tool,
        status: data.status,
        message: data.message,
        payload: data.payload,
        timestamp,
      };
    case 'result':
      if (!data?.agent || typeof data?.output !== 'string') return null;
      return {
        type: 'result',
        agent: data.agent,
        output: data.output,
        steps: Array.isArray(data.steps) ? data.steps : undefined,
        metadata: data.metadata,
        timestamp,
      };
    case 'error':
      if (!data) return null;
      return {
        type: 'error',
        error: typeof data === 'string' ? data : String(data.message ?? data.error ?? 'Agent error'),
        timestamp,
      };
    default:
      return null;
  }
};

export interface DesktopProxyOptions {
  edgeUrl: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  transcriptsDir?: string;
}

const readJsonBody = async (req: IncomingMessage): Promise<any> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    throw new Error('Invalid JSON payload');
  }
};

const createSupabaseClient = (options: DesktopProxyOptions): SupabaseClient | undefined => {
  if (!options.supabaseUrl || !options.supabaseAnonKey) return undefined;
  return createClient(options.supabaseUrl, options.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

export class DesktopAgentProxy {
  private readonly store: TranscriptStore;
  private readonly supabase?: SupabaseClient;

  constructor(private readonly options: DesktopProxyOptions) {
    this.store = new TranscriptStore(options.transcriptsDir);
    this.supabase = createSupabaseClient(options);
  }

  private async forwardJson(payload: any): Promise<Response> {
    return fetch(`${this.options.edgeUrl.replace(/\/$/, '')}/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  private async uploadSummary(events: AgentStreamEvent[], requestId: string, transcriptPath: string) {
    if (!this.supabase || events.length === 0) return;
    const latestResult = [...events].reverse().find((event) => event.type === 'result') as
      | Extract<AgentStreamEvent, { type: 'result' }>
      | undefined;
    const failure = events.find((event) => event.type === 'status' && event.status === 'failed');
    const summary = latestResult?.output ?? (failure ? failure.message ?? 'Task failed' : 'Task completed');
    const transcriptId = transcriptPath.split(/[\\/]/).pop() ?? transcriptPath;
    try {
      await this.supabase.from('logs').insert({
        action: 'desktop_summary',
        details: {
          requestId,
          summary,
          transcriptId,
        },
        risk_level: failure ? 'medium' : 'low',
      });
    } catch (error) {
      console.error('Failed to upload summary to Supabase', error);
    }
  }

  private async proxyStream(
    payload: any,
    res: ServerResponse,
    session: TranscriptSession
  ): Promise<void> {
    const upstream = await this.forwardJson(payload);
    if (!upstream.body) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Edge response missing body' }));
      return;
    }

    res.writeHead(upstream.status, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const reader = upstream.body.getReader();
    let buffer = '';
    const capturedEvents: AgentStreamEvent[] = [];

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      res.write(text);
      buffer += text;
      let boundary = buffer.indexOf('\n\n');
      while (boundary >= 0) {
        const segment = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const parsed = parseSseSegment(segment);
        if (parsed) {
          session.append(parsed.event, parsed.data ?? {});
          if (parsed.event === 'open' && parsed.data?.requestId) {
            session.setRequestId(parsed.data.requestId);
          }
          const streamEvent = toStreamEvent(parsed.event, parsed.data);
          if (streamEvent) {
            capturedEvents.push(streamEvent);
          }
        }
        boundary = buffer.indexOf('\n\n');
      }
    }

    res.end();
    const transcriptPath = await session.finalize();
    await this.uploadSummary(capturedEvents, session.getRequestId(), transcriptPath);
  }

  private async proxyJson(payload: any, res: ServerResponse) {
    const response = await this.forwardJson(payload);
    const text = await response.text();
    res.writeHead(response.status, {
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
    });
    res.end(text);
  }

  readonly handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    try {
      if (req.method !== 'POST' || req.url !== '/agent') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }
      const payload = await readJsonBody(req);
      const session = this.store.createSession({
        input: payload?.input,
        metadata: payload?.input?.metadata,
      });
      if (payload?.stream !== false) {
        await this.proxyStream({ ...payload, stream: true }, res, session);
      } else {
        await this.proxyJson(payload, res);
      }
    } catch (error) {
      console.error('Desktop proxy error', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: (error as Error).message ?? 'Proxy failure', requestId: randomUUID() }));
    }
  };
}

export const startDesktopAgentProxy = (options: DesktopProxyOptions) => {
  const proxy = new DesktopAgentProxy(options);
  const server = createServer(proxy.handleRequest);
  return { proxy, server };
};
