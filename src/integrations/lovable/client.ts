const resolveBaseUrl = () => {
  const base = import.meta.env.VITE_LOVABLE_API_URL ?? '/api/lovable';
  return base.endsWith('/') ? base.slice(0, -1) : base;
};

const getProjectId = () => import.meta.env.VITE_LOVABLE_PROJECT_ID ?? '';
const getApiKey = () => import.meta.env.VITE_LOVABLE_API_KEY ?? '';

interface RequestOptions extends RequestInit {
  query?: Record<string, string | number | boolean | undefined>;
}

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const baseUrl = resolveBaseUrl();
  const url = new URL(`${baseUrl}${path}`); 
  const query = options.query ?? {};
  const projectId = getProjectId();
  if (projectId && !query.projectId) {
    url.searchParams.set('projectId', projectId);
  }
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }

  const headers = new Headers(options.headers);
  const apiKey = getApiKey();
  if (apiKey) {
    headers.set('Authorization', `Bearer ${apiKey}`);
  }
  if (projectId) {
    headers.set('X-Lovable-Project', projectId);
  }
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url.toString(), { ...options, headers });
  if (!response.ok) {
    const message = await response.text().catch(() => 'Lovable Cloud request failed');
    throw new Error(`${response.status} ${response.statusText}: ${message}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
};

export interface LovableTask {
  id: string;
  createdAt: string;
  taskType: string;
  status: string;
  progress: number;
  modelUsed?: string | null;
}

export const fetchRecentTasks = async (limit = 10): Promise<LovableTask[]> => {
  const data = await request<{ tasks?: LovableTask[] }>('/tasks', {
    query: { limit },
  });
  return (data.tasks ?? []).map(normalizeTask);
};

export interface LovableLog {
  id: string;
  createdAt: string;
  action: string;
  riskLevel?: string | null;
  details?: unknown;
}

export const fetchRecentLogs = async (limit = 100): Promise<LovableLog[]> => {
  const data = await request<{ logs?: LovableLog[] }>('/logs', {
    query: { limit },
  });
  return (data.logs ?? []).map(normalizeLog);
};

export type LovableStreamResource = 'tasks' | 'logs';

export const subscribeToLovableStream = <T>(
  resource: LovableStreamResource,
  onEvent: (payload: T) => void,
): (() => void) => {
  if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
    return () => {};
  }

  const baseUrl = resolveBaseUrl();
  const projectId = getProjectId();
  const url = new URL(`${baseUrl}/stream/${resource}`);
  if (projectId) {
    url.searchParams.set('projectId', projectId);
  }
  const source = new EventSource(url.toString());
  source.onmessage = (event) => {
    try {
      const raw = JSON.parse(event.data) as unknown;
      const payload = transformStreamPayload<T>(resource, raw);
      if (payload) {
        onEvent(payload);
      }
    } catch (error) {
      console.warn('Failed to parse Lovable stream payload', error);
    }
  };
  source.onerror = (error) => {
    console.warn('Lovable stream disconnected', error);
    source.close();
  };
  return () => source.close();
};

export const lovableClient = {
  fetchRecentTasks,
  fetchRecentLogs,
  subscribeToLovableStream,
};

export type { LovableTask as TaskSummary, LovableLog as AuditLogEntry };

const randomId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const normalizeTask = (task: Partial<LovableTask> & Record<string, unknown>): LovableTask => ({
  id: String(task.id ?? randomId()),
  createdAt: String(task.createdAt ?? task.created_at ?? new Date().toISOString()),
  taskType: String(task.taskType ?? task.task_type ?? 'unknown'),
  status: String(task.status ?? 'pending'),
  progress: Number(task.progress ?? 0),
  modelUsed: (task.modelUsed ?? task.model_used ?? null) as string | null,
});

const normalizeLog = (log: Partial<LovableLog> & Record<string, unknown>): LovableLog => ({
  id: String(log.id ?? randomId()),
  createdAt: String(log.createdAt ?? log.created_at ?? new Date().toISOString()),
  action: String(log.action ?? log.event ?? 'unknown'),
  riskLevel: (log.riskLevel ?? log.risk_level ?? null) as string | null,
  details: log.details ?? log.payload ?? undefined,
});

const transformStreamPayload = <T>(resource: LovableStreamResource, payload: unknown): T | undefined => {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }
  switch (resource) {
    case 'tasks':
      return normalizeTask(payload as Record<string, unknown>) as T;
    case 'logs':
      return normalizeLog(payload as Record<string, unknown>) as T;
    default:
      return payload as T;
  }
};
