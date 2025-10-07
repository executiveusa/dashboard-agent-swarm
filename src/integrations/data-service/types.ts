export interface TaskRecord {
  id: string;
  created_at: string;
  task_type: string;
  status: string;
  progress: number;
  model_used: string | null;
  tokens_used?: number | null;
  cost?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface LogRecord {
  id: string;
  created_at: string;
  task_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  risk_level: string | null;
}

export type TaskEventType = "insert" | "update" | "delete" | "ready";

export type LogEventType = "insert" | "ready";

export interface TaskStreamEvent {
  type: TaskEventType;
  task?: TaskRecord;
  previous?: TaskRecord;
}

export interface LogStreamEvent {
  type: LogEventType;
  log?: LogRecord;
}

export interface ApiListResponse<T> {
  data: T[];
}
