import { randomUUID } from 'node:crypto';
import { AuditEvent } from '@ai-agent-platform/shared';
import { getSupabaseClient } from './db.js';

export interface AuditLoggerOptions {
  sessionId?: string;
}

export const createAuditLogger = (options: AuditLoggerOptions = {}) => {
  const client = getSupabaseClient();
  return {
    newEvent(type: string, message: string, payload?: Record<string, unknown>): AuditEvent {
      return {
        requestId: randomUUID(),
        sessionId: options.sessionId,
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

