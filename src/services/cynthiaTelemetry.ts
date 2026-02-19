/**
 * Cynthia Telemetry API Client
 * READ-ONLY observability layer for external agent "Cynthia"
 */

export interface TelemetryEvent {
  id?: string;
  session_id: string;
  agent: string;
  event_type: string;
  summary?: string;
  data: Record<string, any>;
  timestamp?: string;
  created_at?: string;
}

export interface AgentSession {
  id?: string;
  session_id: string;
  agent: string;
  mode?: string;
  goal?: string;
  model?: string;
  status?: "active" | "completed" | "failed" | "paused";
  started_at?: string;
  ended_at?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  event_count?: number;
}

export interface ListSessionsParams {
  limit?: number;
  agent?: string;
  status?: "active" | "completed" | "failed" | "paused";
}

export interface ListEventsParams {
  limit?: number;
  session_id?: string;
  agent?: string;
  type?: string;
}

export interface SessionEventsResponse {
  success: boolean;
  session: AgentSession;
  events: TelemetryEvent[];
  count: number;
}

export interface ListSessionsResponse {
  success: boolean;
  sessions: AgentSession[];
  count: number;
}

export interface ListEventsResponse {
  success: boolean;
  events: TelemetryEvent[];
  count: number;
}

/**
 * Get base API URL from environment or default to current origin
 */
function getApiBaseUrl(): string {
  // In development, Vite proxies /api to backend
  // In production, nginx handles the routing
  return "";
}

/**
 * Get list of sessions with optional filtering
 */
export async function listSessions(
  params: ListSessionsParams = {}
): Promise<ListSessionsResponse> {
  const queryParams = new URLSearchParams();

  if (params.limit) queryParams.set("limit", params.limit.toString());
  if (params.agent) queryParams.set("agent", params.agent);
  if (params.status) queryParams.set("status", params.status);

  const url = `${getApiBaseUrl()}/api/telemetry/sessions?${queryParams}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to fetch sessions: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Get events for a specific session (session replay)
 */
export async function getSessionEvents(
  sessionId: string,
  params: ListEventsParams = {}
): Promise<SessionEventsResponse> {
  const queryParams = new URLSearchParams();

  if (params.limit) queryParams.set("limit", params.limit.toString());

  const url = `${getApiBaseUrl()}/api/telemetry/sessions/${sessionId}/events?${queryParams}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to fetch session events: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Get list of recent events with optional filtering
 */
export async function listEvents(
  params: ListEventsParams = {}
): Promise<ListEventsResponse> {
  const queryParams = new URLSearchParams();

  if (params.limit) queryParams.set("limit", params.limit.toString());
  if (params.session_id) queryParams.set("session_id", params.session_id);
  if (params.agent) queryParams.set("agent", params.agent);
  if (params.type) queryParams.set("type", params.type);

  const url = `${getApiBaseUrl()}/api/telemetry/events?${queryParams}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to fetch events: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Subscribe to real-time event stream via Server-Sent Events (SSE)
 */
export function subscribeToEventStream(
  onEvent: (event: any) => void,
  onError?: (error: Error) => void
): () => void {
  const url = `${getApiBaseUrl()}/api/telemetry/stream`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
    } catch (error) {
      console.error("Failed to parse SSE event:", error);
      onError?.(error as Error);
    }
  };

  eventSource.onerror = (error) => {
    console.error("SSE connection error:", error);
    onError?.(new Error("SSE connection error"));
  };

  // Return cleanup function
  return () => {
    eventSource.close();
  };
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than 1 minute
  if (diff < 60000) {
    return "just now";
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }

  // Format as date
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get event type icon/color
 */
export function getEventTypeStyle(eventType: string): {
  icon: string;
  color: string;
} {
  const styles: Record<string, { icon: string; color: string }> = {
    tool_call: { icon: "🔧", color: "text-blue-500" },
    reasoning: { icon: "💭", color: "text-purple-500" },
    state_change: { icon: "🔄", color: "text-green-500" },
    error: { icon: "❌", color: "text-red-500" },
    warning: { icon: "⚠️", color: "text-yellow-500" },
    success: { icon: "✅", color: "text-green-500" },
    info: { icon: "ℹ️", color: "text-blue-500" },
  };

  return styles[eventType] || { icon: "📝", color: "text-gray-500" };
}
