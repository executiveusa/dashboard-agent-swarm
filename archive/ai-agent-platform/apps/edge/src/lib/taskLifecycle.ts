import { getPersistenceClient } from './persistence.js';
import type { LogRecordInput } from './persistence.js';

export interface TaskLifecycleOptions {
  id: string;
  taskType: string;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskLifecycle {
  start: (details?: Record<string, unknown>) => Promise<void>;
  complete: (
    status: 'completed' | 'failed',
    details?: Record<string, unknown>,
    riskLevel?: LogRecordInput['riskLevel']
  ) => Promise<void>;
}

export const createTaskLifecycle = (options: TaskLifecycleOptions): TaskLifecycle => {
  const persistence = getPersistenceClient();
  const startedAt = new Date().toISOString();

  return {
    async start(details) {
      try {
        await persistence.createTaskSnapshot({
          id: options.id,
          taskType: options.taskType,
          status: 'running',
          progress: 0,
          createdAt: startedAt,
          sessionId: options.sessionId,
          userId: options.userId,
          metadata: options.metadata ?? {},
        });
        await persistence.appendLog({
          taskId: options.id,
          sessionId: options.sessionId,
          action: 'task_started',
          riskLevel: 'low',
          details: {
            ...(options.metadata ?? {}),
            ...(details ?? {}),
            taskType: options.taskType,
          },
          createdAt: startedAt,
        });
      } catch (error) {
        console.warn('Failed to persist task start', { error: (error as Error).message });
      }
    },
    async complete(status, details, riskLevel) {
      const timestamp = new Date().toISOString();
      try {
        await persistence.updateTaskSnapshot(options.id, {
          status,
          progress: status === 'completed' ? 100 : 0,
          completedAt: status === 'completed' ? timestamp : undefined,
          updatedAt: timestamp,
        });
        await persistence.appendLog({
          taskId: options.id,
          sessionId: options.sessionId,
          action: status === 'completed' ? 'task_completed' : 'task_failed',
          riskLevel: riskLevel ?? (status === 'failed' ? 'high' : 'low'),
          details: details ?? {},
          createdAt: timestamp,
        });
      } catch (error) {
        console.warn('Failed to persist task lifecycle', { error: (error as Error).message });
      }
    },
  };
};
