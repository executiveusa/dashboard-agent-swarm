import { randomUUID } from 'node:crypto';
import { AuditEvent } from '@ai-agent-platform/shared';
import { getPersistenceClient } from './persistence.js';

export interface AuditLoggerOptions {
  sessionId?: string;
}

export const createAuditLogger = (options: AuditLoggerOptions = {}) => {
  const persistence = getPersistenceClient();
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
      try {
        await persistence.recordAuditLog(sanitized);
      } catch (error) {
        console.warn('Failed to persist audit log', { error: (error as Error).message });
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

