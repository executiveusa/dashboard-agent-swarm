/**
 * Agent Claw API Service
 * Communicates with Agent Zero's Flask backend (port 50001)
 * Proxied through Vite at /agent-claw/*
 */

const BASE = "/agent-claw";

async function post<T>(endpoint: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Agent Claw ${endpoint}: ${res.status}`);
  return res.json() as Promise<T>;
}

/* ── Health ──────────────────────────────────────── */

export interface AgentClawHealth {
  status: string;
  gitinfo?: Record<string, unknown>;
  error?: string;
}

export async function getHealth(): Promise<AgentClawHealth> {
  return post("/health");
}

/* ── Poll (beads / progress / tasks / contexts) ──── */

export interface PollParams {
  context?: string;
  log_from?: number;
  notifications_from?: number;
}

export interface LogEntry {
  no: number;
  type: string;
  heading: string;
  content?: string;
  temp?: boolean;
}

export interface TaskEntry {
  id: string;
  task_name: string;
  type: "adhoc" | "scheduled" | "planned";
  state: "idle" | "running" | "disabled" | "error";
  schedule?: string;
  next_run?: number;
  last_run?: number;
  last_error?: string;
}

export interface ContextEntry {
  id: string;
  name?: string;
  paused: boolean;
}

export interface PollResponse {
  ok: boolean;
  contexts?: ContextEntry[];
  logs?: LogEntry[];
  log_progress?: string;
  log_progress_active?: boolean;
  tasks?: TaskEntry[];
  notifications?: unknown[];
}

export async function poll(params: PollParams = {}): Promise<PollResponse> {
  return post("/poll", params);
}

/* ── Chat / Message ──────────────────────────────── */

export interface MessageParams {
  context: string;
  text: string;
}

export interface MessageResponse {
  ok: boolean;
  response?: string;
}

export async function sendMessage(params: MessageParams): Promise<MessageResponse> {
  return post("/message", params);
}

export async function createChat(): Promise<{ id: string }> {
  return post("/chat_create");
}

/* ── Scheduler ───────────────────────────────────── */

export async function listTasks(): Promise<{ tasks: TaskEntry[] }> {
  return post("/scheduler_tasks_list");
}

export async function createTask(params: {
  type: string;
  task_name: string;
  schedule?: string;
  prompt: string;
}): Promise<{ ok: boolean }> {
  return post("/scheduler_task_create", params);
}

export async function runTask(taskId: string): Promise<{ ok: boolean }> {
  return post("/scheduler_task_run", { task_id: taskId });
}

export async function deleteTask(taskId: string): Promise<{ ok: boolean }> {
  return post("/scheduler_task_delete", { task_id: taskId });
}

export async function updateTask(taskId: string, updates: Record<string, unknown>): Promise<{ ok: boolean }> {
  return post("/scheduler_task_update", { task_id: taskId, ...updates });
}

/* ── Voice Commands (SYNTHIA) ────────────────────── */

export interface VoiceCommandMatch {
  matched_command: string | null;
  confidence?: number;
  tool_name?: string;
  tool_args_template?: Record<string, unknown>;
  missing_slots?: string[];
  category?: string;
  needs_confirmation?: boolean;
  admin_only?: boolean;
  utterance: string;
  message?: string;
}

export interface VoiceCommandInfo {
  id: string;
  category: string;
  triggers: string[];
  tool_name: string;
  confirm: boolean;
  admin_only: boolean;
}

export async function routeVoiceCommand(utterance: string): Promise<VoiceCommandMatch> {
  return post("/voice_command_route", { utterance });
}

export async function getVoiceCommandHelp(category?: string): Promise<{ commands: VoiceCommandInfo[]; total: number }> {
  return post("/voice_command_help", category ? { category } : {});
}

/* ── Pause / Nudge ───────────────────────────────── */

export async function pauseContext(context: string): Promise<{ ok: boolean }> {
  return post("/pause", { context });
}

export async function nudgeContext(context: string): Promise<{ ok: boolean }> {
  return post("/nudge", { context });
}

/* ── TTS / STT ───────────────────────────────────── */

export async function synthesize(text: string): Promise<{ audio_url?: string }> {
  return post("/synthesize", { text });
}

export async function transcribe(audioBlob: Blob): Promise<{ text?: string; transcript?: string }> {
  const formData = new FormData();
  formData.append("audio", audioBlob);
  const res = await fetch(`${BASE}/transcribe`, { method: "POST", body: formData });
  if (!res.ok) throw new Error(`Transcribe failed: ${res.status}`);
  return res.json();
}
