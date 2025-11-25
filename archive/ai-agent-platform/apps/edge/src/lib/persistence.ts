import type { AuditEvent } from '@ai-agent-platform/shared';
import { getEnv } from './env.js';

export interface TaskRecordInput {
  id: string;
  taskType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  modelUsed?: string | null;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskRecordUpdate extends Partial<Omit<TaskRecordInput, 'id' | 'taskType'>> {
  status?: TaskRecordInput['status'];
  progress?: number;
  modelUsed?: string | null;
  completedAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface LogRecordInput {
  id?: string;
  taskId?: string;
  sessionId?: string;
  action: string;
  riskLevel?: 'critical' | 'high' | 'medium' | 'low' | null;
  details?: Record<string, unknown>;
  createdAt?: string;
}

export interface PersistenceClient {
  getWorkflowDefinition(name: string): Promise<string | null>;
  createTaskSnapshot(record: TaskRecordInput): Promise<void>;
  updateTaskSnapshot(id: string, updates: TaskRecordUpdate): Promise<void>;
  appendLog(entry: LogRecordInput): Promise<void>;
  recordAuditLog(event: AuditEvent): Promise<void>;
}

let cachedClient: PersistenceClient | undefined;

const normaliseBaseUrl = (baseUrl: string): string => {
  if (!baseUrl) {
    throw new Error('DATA_API_URL is required to initialise the persistence client');
  }
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
};

const buildUrl = (base: string, path: string): string => {
  const normalised = path.replace(/^\/+/, '');
  return new URL(normalised, base).toString();
};

const createPersistenceClient = (): PersistenceClient => {
  const env = getEnv();
  const baseUrl = normaliseBaseUrl(env.DATA_API_URL);
  const token = env.DATA_API_TOKEN;

  const defaultHeaders: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const authorisationHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const request = async (path: string, init: RequestInit): Promise<Response> => {
    const response = await fetch(buildUrl(baseUrl, path), {
      ...init,
      headers: {
        ...defaultHeaders,
        ...authorisationHeader,
        ...(init.headers as Record<string, string> | undefined),
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return response;
      }
      const message = await response.text().catch(() => response.statusText);
      throw new Error(`Persistence request to ${path} failed with ${response.status}: ${message}`);
    }

    return response;
  };

  return {
    async getWorkflowDefinition(name) {
      const response = await request(`workflows/${encodeURIComponent(name)}`, { method: 'GET' });
      if (response.status === 404) {
        return null;
      }
      const payload = await response.json().catch(() => ({}));
      const definition =
        (typeof payload.definition === 'string' && payload.definition) ||
        (payload.data && typeof payload.data.definition === 'string' && payload.data.definition);
      return typeof definition === 'string' ? definition : null;
    },
    async createTaskSnapshot(record) {
      await request('tasks', { method: 'POST', body: JSON.stringify(record) });
    },
    async updateTaskSnapshot(id, updates) {
      await request(`tasks/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },
    async appendLog(entry) {
      await request('logs', { method: 'POST', body: JSON.stringify(entry) });
    },
    async recordAuditLog(event) {
      await request('audit', { method: 'POST', body: JSON.stringify(event) });
    },
  };
};

export const getPersistenceClient = (): PersistenceClient => {
  if (!cachedClient) {
    cachedClient = createPersistenceClient();
  }
  return cachedClient;
};
