import { ApiListResponse, LogRecord, LogStreamEvent, TaskRecord, TaskStreamEvent } from "./types";

const DEFAULT_API_BASE = "http://localhost:8787";

const apiBase = ((): string => {
  const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.replace(/\/$/, "");
  }
  return DEFAULT_API_BASE;
})();

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API request failed with ${response.status}: ${text}`);
  }
  return (await response.json()) as T;
}

export async function fetchRecentTasks(limit = 10): Promise<TaskRecord[]> {
  const url = new URL("/api/tasks", apiBase);
  url.searchParams.set("limit", String(limit));
  const response = await fetch(url.toString(), {
    headers: { "Accept": "application/json" },
  });
  const payload = await parseJson<ApiListResponse<TaskRecord>>(response);
  return payload.data;
}

export async function fetchRecentLogs(limit = 100): Promise<LogRecord[]> {
  const url = new URL("/api/logs", apiBase);
  url.searchParams.set("limit", String(limit));
  const response = await fetch(url.toString(), {
    headers: { "Accept": "application/json" },
  });
  const payload = await parseJson<ApiListResponse<LogRecord>>(response);
  return payload.data;
}

export function subscribeToTaskStream(
  onEvent: (event: TaskStreamEvent) => void,
  onError?: (error: Event) => void
): () => void {
  const url = new URL("/api/tasks/stream", apiBase);
  const source = new EventSource(url.toString(), { withCredentials: false });

  source.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data) as TaskStreamEvent;
      onEvent(payload);
    } catch (error) {
      console.error("Failed to parse task stream event", error);
    }
  };

  if (onError) {
    source.onerror = onError;
  }

  return () => {
    source.close();
  };
}

export function subscribeToLogStream(
  onEvent: (event: LogStreamEvent) => void,
  onError?: (error: Event) => void
): () => void {
  const url = new URL("/api/logs/stream", apiBase);
  const source = new EventSource(url.toString(), { withCredentials: false });

  source.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data) as LogStreamEvent;
      onEvent(payload);
    } catch (error) {
      console.error("Failed to parse log stream event", error);
    }
  };

  if (onError) {
    source.onerror = onError;
  }

  return () => {
    source.close();
  };
}
