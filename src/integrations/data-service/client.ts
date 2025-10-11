import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_API_BASE = import.meta.env.VITE_DATA_API_BASE_URL?.trim() ?? "";

export type RealtimeEventType = "insert" | "update" | "delete" | "snapshot" | "noop";

export interface RealtimeEvent<T> {
  type: RealtimeEventType;
  record: T;
}

export interface UseRealtimeCollectionOptions<T> {
  /**
   * Resource identifier that will be appended to the API base URL when fetching snapshots.
   */
  resource: string;
  /**
   * Channel identifier used when subscribing to realtime updates.
   */
  channel: string;
  /**
   * Optional override for the snapshot endpoint relative to the API base URL.
   */
  snapshotPath?: string;
  /**
   * Optional override for the realtime endpoint relative to the API base URL.
   */
  realtimePath?: string;
  /**
   * Maximum number of records to retain locally.
   */
  limit?: number;
  /**
   * Custom handler for converting incoming SSE payloads into one or more realtime events.
   */
  transformEvent?: (payload: unknown) => RealtimeEvent<T> | RealtimeEvent<T>[] | null | undefined;
  /**
   * Allows callers to transform the snapshot payload before it reaches state.
   */
  transformSnapshot?: (payload: unknown) => T[];
  /**
   * Override the default merge behaviour when applying realtime events.
   */
  applyEvent?: (current: T[], event: RealtimeEvent<T>) => T[];
  /**
   * Provide a deterministic key extractor used by the default merge handler.
   */
  getKey?: (item: T) => string | number | undefined;
  /**
   * Additional query parameters appended to the snapshot request.
   */
  query?: Record<string, string | number | boolean | undefined>;
  /**
   * Whether EventSource should include credentials. Defaults to false.
   */
  withCredentials?: boolean;
  /**
   * Optionally seed the state with preloaded data.
   */
  initial?: T[];
}

export interface UseRealtimeCollectionState<T> {
  data: T[];
  loading: boolean;
  error?: Error;
  refresh: () => Promise<void>;
}

const ensureBaseUrl = (path: string): string => {
  const trimmedBase = DEFAULT_API_BASE;
  const normalisedPath = path.replace(/^\/+/, "");

  if (!trimmedBase) {
    if (typeof window === "undefined") {
      return new URL(normalisedPath, "http://localhost/").toString();
    }
    return new URL(normalisedPath, `${window.location.origin}/`).toString();
  }

  if (/^https?:\/\//i.test(trimmedBase)) {
    return new URL(normalisedPath, trimmedBase.endsWith("/") ? trimmedBase : `${trimmedBase}/`).toString();
  }

  const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const baseWithSlash = trimmedBase.startsWith("/") ? trimmedBase : `/${trimmedBase}`;
  return new URL(`${baseWithSlash.replace(/\/+$/, "")}/${normalisedPath}`, `${origin}/`).toString();
};

const buildSearchParams = (params?: Record<string, string | number | boolean | undefined>): string => {
  if (!params) {
    return "";
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    search.set(key, String(value));
  }
  const serialised = search.toString();
  return serialised ? `?${serialised}` : "";
};

const defaultSnapshotTransformer = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (payload && typeof payload === "object") {
    const container = payload as Record<string, unknown>;
    const candidates = [container.data, container.items, container.records];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as T[];
      }
    }
  }
  return [];
};

const mapEventType = (input: string): RealtimeEventType => {
  const normalised = input.toLowerCase();
  switch (normalised) {
    case "insert":
    case "create":
    case "added":
      return "insert";
    case "update":
    case "modified":
    case "upsert":
      return "update";
    case "delete":
    case "removed":
      return "delete";
    case "snapshot":
    case "sync":
      return "snapshot";
    default:
      return "noop";
  }
};

const defaultEventTransformer = <T,>(payload: unknown): RealtimeEvent<T> | RealtimeEvent<T>[] | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const data = payload as Record<string, unknown>;

  const typeHint =
    (typeof data.type === "string" && data.type) ||
    (typeof data.eventType === "string" && data.eventType) ||
    (typeof data.action === "string" && data.action) ||
    "insert";

  const record = (
    data.record ??
    data.data ??
    data.new ??
    data.after ??
    data.payload ??
    data.old ??
    payload
  ) as T;

  if (Array.isArray(record)) {
    return record.map((item) => ({ type: mapEventType(typeHint), record: item }));
  }

  return { type: mapEventType(typeHint), record };
};

const defaultKeySelector = <T,>(item: T): string | number | undefined => {
  if (!item || typeof item !== "object") {
    return undefined;
  }
  const candidate = (item as Record<string, unknown>).id;
  if (typeof candidate === "string" || typeof candidate === "number") {
    return candidate;
  }
  return undefined;
};

const defaultMerge = <T,>(limit: number, getKey: (item: T) => string | number | undefined) =>
  (current: T[], event: RealtimeEvent<T>): T[] => {
    if (!event.record) {
      return current;
    }

    const key = getKey(event.record);
    if (key === undefined) {
      if (event.type === "delete") {
        return current;
      }
      return [event.record, ...current].slice(0, limit);
    }

    switch (event.type) {
      case "delete":
        return current.filter((item) => getKey(item) !== key);
      case "update": {
        let replaced = false;
        const updated = current.map((item) => {
          if (getKey(item) === key) {
            replaced = true;
            return event.record;
          }
          return item;
        });
        if (!replaced) {
          return [event.record, ...updated].slice(0, limit);
        }
        return updated;
      }
      case "snapshot":
      case "insert": {
        const withoutDuplicate = current.filter((item) => getKey(item) !== key);
        return [event.record, ...withoutDuplicate].slice(0, limit);
      }
      default:
        return current;
    }
  };

export function useRealtimeCollection<T>(
  options: UseRealtimeCollectionOptions<T>
): UseRealtimeCollectionState<T> {
  const limit = options.limit ?? 50;
  const [data, setData] = useState<T[]>(options.initial ?? []);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | undefined>();
  const controllerRef = useRef<AbortController | null>(null);

  const getKey = useMemo(() => options.getKey ?? defaultKeySelector<T>, [options.getKey]);
  const mergeEvent = useMemo(
    () => options.applyEvent ?? defaultMerge<T>(limit, getKey),
    [options.applyEvent, limit, getKey]
  );
  const transformSnapshot = useMemo(
    () => options.transformSnapshot ?? defaultSnapshotTransformer<T>,
    [options.transformSnapshot]
  );
  const transformEvent = useMemo(
    () => options.transformEvent ?? defaultEventTransformer<T>,
    [options.transformEvent]
  );

  const fetchSnapshot = useCallback(
    async (signal?: AbortSignal) => {
      const endpoint = options.snapshotPath ?? options.resource;
      const query: Record<string, string | number | boolean | undefined> = {
        ...options.query,
        limit,
      };
      const url = `${ensureBaseUrl(endpoint)}${buildSearchParams(query)}`;

      const response = await fetch(url, {
        method: "GET",
        signal,
        headers: { Accept: "application/json" },
        credentials: options.withCredentials ? "include" : "same-origin",
      });

      if (!response.ok) {
        throw new Error(`Snapshot request failed with status ${response.status}`);
      }

      const payload = await response.json().catch((err) => {
        console.error("Failed to parse snapshot JSON response:", err);
        return [];
      });
      return transformSnapshot(payload);
    },
    [limit, options.query, options.resource, options.snapshotPath, options.withCredentials, transformSnapshot]
  );

  const refresh = useCallback(async () => {
    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;

    try {
      setLoading(true);
      setError(undefined);
      const next = await fetchSnapshot(controller.signal);
      setData(next);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err as Error);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchSnapshot]);

  useEffect(() => {
    refresh().catch((err) => {
      if ((err as Error).name !== "AbortError") {
        setError(err as Error);
      }
    });

    return () => {
      controllerRef.current?.abort();
    };
  }, [refresh]);

  useEffect(() => {
    const realtimeEndpoint = options.realtimePath ?? `realtime/${options.channel}`;
    const query: Record<string, string | number | boolean | undefined> = {
      limit,
    };
    const source = new EventSource(`${ensureBaseUrl(realtimeEndpoint)}${buildSearchParams(query)}`, {
      withCredentials: options.withCredentials ?? false,
    });

    source.onmessage = (event) => {
      try {
        const payload = event.data ? JSON.parse(event.data) : undefined;
        const transformed = transformEvent(payload);
        if (!transformed) {
          return;
        }
        const events = Array.isArray(transformed) ? transformed : [transformed];
        setData((current) => {
          let nextState = current;
          for (const evt of events) {
            if (!evt || !evt.record) continue;
            nextState = mergeEvent(nextState, evt);
          }
          return nextState;
        });
      } catch (err) {
        // Try to extract event type from payload if possible
        let eventType: string | undefined;
        let payloadData: string | undefined;
        try {
          const payload = event.data ? JSON.parse(event.data) : undefined;
          eventType = payload?.type;
          payloadData = event.data;
        } catch {
          // Ignore, fallback to undefined
        }
        console.warn(
          `Failed to process realtime payload on channel "${options.channel}"` +
          (eventType ? ` (event type: "${eventType}")` : "") +
          `. Payload: ${payloadData}`,
          err
        );
      }
    };

    source.onerror = (evt) => {
      console.warn("Realtime channel error", evt);
    };

    return () => {
      source.close();
    };
  }, [limit, mergeEvent, options.channel, options.realtimePath, options.withCredentials, transformEvent]);

  return useMemo(
    () => ({
      data,
      loading,
      error,
      refresh,
    }),
    [data, error, loading, refresh]
  );
}

export const __internal = {
  ensureBaseUrl,
  defaultSnapshotTransformer,
  defaultEventTransformer,
  defaultMerge,
  defaultKeySelector,
};
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
