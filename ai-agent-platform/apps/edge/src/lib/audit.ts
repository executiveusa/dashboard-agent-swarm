import { randomUUID } from 'node:crypto';
import { AuditEvent, StructuredAuditEvent } from '@ai-agent-platform/shared';
import { getSupabaseClient } from './db.js';

export interface AuditLoggerOptions {
  sessionId?: string;
  requestId?: string;
}

export const createAuditLogger = (options: AuditLoggerOptions = {}) => {
  const client = getSupabaseClient();
  const sessionId = options.sessionId;
  const requestId = options.requestId;

  const persistStructured = async (event: StructuredAuditEvent): Promise<void> => {
    const structuredEvent: StructuredAuditEvent = {
      ...event,
      sessionId: event.sessionId ?? sessionId,
      requestId: event.requestId ?? requestId,
      timestamp: event.timestamp ?? new Date().toISOString(),
    };

    const { error: structuredError } = await client.from('structured_audit_events').insert({
      session_id: structuredEvent.sessionId,
      request_id: structuredEvent.requestId,
      category: structuredEvent.category,
      name: structuredEvent.name,
      action: structuredEvent.action,
      duration_ms: structuredEvent.durationMs ?? null,
      cost_usd: structuredEvent.costUsd ?? null,
      metadata: redactSecrets(structuredEvent.metadata ?? {}),
      created_at: structuredEvent.timestamp,
    });

    if (structuredError) {
      console.warn('Failed to persist structured audit event', { error: structuredError.message });
    }

    if (structuredEvent.durationMs !== undefined) {
      const { error: latencyError } = await client.rpc('record_metric', {
        metric_name: `${structuredEvent.category}_latency_ms`,
        metric_value: structuredEvent.durationMs,
        metric_dimensions: JSON.stringify({
          category: structuredEvent.category,
          name: structuredEvent.name,
          action: structuredEvent.action,
        }),
      });
      if (latencyError) {
        console.warn('Failed to record latency metric', { error: latencyError.message });
      }
    }

    if (structuredEvent.costUsd !== undefined) {
      const { error: costError } = await client.rpc('record_metric', {
        metric_name: `${structuredEvent.category}_cost_usd`,
        metric_value: structuredEvent.costUsd,
        metric_dimensions: JSON.stringify({
          category: structuredEvent.category,
          name: structuredEvent.name,
        }),
      });
      if (costError) {
        console.warn('Failed to record cost metric', { error: costError.message });
      }
    }
  };

  return {
    newEvent(type: string, message: string, payload?: Record<string, unknown>): AuditEvent {
      return {
        requestId: randomUUID(),
        sessionId,
        type,
        message,
        payload,
        createdAt: new Date().toISOString(),
      };
    },
    async record(event: AuditEvent): Promise<void> {
      const sanitized = {
        ...event,
        payload: redactSecrets(event.payload ?? {}),
      };
      console.info('[audit]', sanitized);
      const { error } = await client.from('audit_logs').insert({
        request_id: sanitized.requestId,
        session_id: sanitized.sessionId,
        type: sanitized.type,
        message: sanitized.message,
        payload: sanitized.payload,
        created_at: sanitized.createdAt,
      });
      if (error) {
        console.warn('Failed to persist audit log', { error: error.message });
      }
    },
    async recordStructured(event: StructuredAuditEvent): Promise<void> {
      try {
        await persistStructured(event);
      } catch (error) {
        console.warn('Failed to record structured audit event', error);
      }
    },
    async time<T>(
      event: Omit<StructuredAuditEvent, 'action' | 'durationMs' | 'timestamp'> & { metadata?: Record<string, unknown> },
      run: () => Promise<T>,
    ): Promise<T> {
      const start = Date.now();
      await persistStructured({ ...event, action: 'start', metadata: event.metadata });
      try {
        const result = await run();
        const duration = Date.now() - start;
        await persistStructured({
          ...event,
          action: 'finish',
          durationMs: duration,
          metadata: event.metadata,
        });
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        await persistStructured({
          ...event,
          action: 'error',
          durationMs: duration,
          metadata: {
            ...(event.metadata ?? {}),
            error: (error as Error).message,
          },
        });
        throw error;
      }
    },
  };
};

const redactSecrets = (payload: Record<string, unknown>): Record<string, unknown> => {
  const clone: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key.toLowerCase().includes('key') || key.toLowerCase().includes('secret')) {
      clone[key] = '***';
    } else {
      clone[key] = value;
    }
  }
  return clone;
};
