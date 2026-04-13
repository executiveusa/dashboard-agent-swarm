export type CrewStatus = "online" | "idle" | "offline";
export type TaskState = "queued" | "running" | "blocked" | "done";
export type HealthState = "healthy" | "degraded" | "down";

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  status: CrewStatus;
  focus: string;
  lastSeen: string;
}

export interface HealthCheck {
  id: string;
  label: string;
  status: HealthState;
  detail: string;
  percent: number;
}

export interface TaskItem {
  id: string;
  title: string;
  state: TaskState;
  owner: string;
  eta: string;
  tags: string[];
}

export interface DashboardSnapshot {
  welcome: {
    name: string;
    summary: string;
  };
  crew: CrewMember[];
  health: HealthCheck[];
  tasks: TaskItem[];
  stats: {
    queued: number;
    running: number;
    alerts: number;
  };
}

export interface OnboardingRunResult {
  status: string;
  org_id: string;
  project_id: string;
  tasks_executed: number;
  profile: Record<string, unknown>;
  results: Array<Record<string, unknown>>;
}

const API_BASE = "/api";

/**
 * Probe a service health endpoint and return its state
 */
async function probeHealth(url: string, label: string, id: string): Promise<HealthCheck> {
  try {
    const start = performance.now();
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const latency = Math.round(performance.now() - start);
    if (res.ok) {
      return {
        id,
        label,
        status: "healthy",
        detail: `Responding · ${latency}ms`,
        percent: Math.min(100, Math.max(60, 100 - latency / 10)),
      };
    }
    return { id, label, status: "degraded", detail: `HTTP ${res.status}`, percent: 40 };
  } catch {
    return { id, label, status: "down", detail: "Unreachable", percent: 0 };
  }
}

/**
 * Build real crew status from agent health probes
 */
async function buildCrewStatus(): Promise<CrewMember[]> {
  try {
    const res = await fetch(`${API_BASE}/agents/runtime/agents`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const payload = await res.json();
    const agents = Array.isArray(payload?.agents) ? payload.agents : [];
    return agents.slice(0, 16).map((agent: any) => ({
      id: String(agent.id),
      name: String(agent.name || agent.id),
      role: String(agent.role || 'agent'),
      status:
        agent.status === 'active'
          ? 'online'
          : agent.status === 'idle'
            ? 'idle'
            : 'offline',
      focus: String(agent.specialty || 'General operations'),
      lastSeen: 'Live runtime',
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch real tasks from ArchonX-backed API
 */
async function fetchTasks(): Promise<TaskItem[]> {
  try {
    const res = await fetch(`${API_BASE}/agents/runtime/tasks`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.slice(0, 12).map((t: any, i: number) => ({
          id: t.id || `task-${i}`,
          title: t.title || t.description || "Untitled task",
          state: t.state || t.status || "queued",
          owner: t.owner || t.assigned_to || "Unassigned",
          eta: t.eta || "—",
          tags: t.tags || [],
        }));
      }
    }
  } catch {
    // Runtime unavailable.
  }
  return [];
}

/**
 * Get dashboard snapshot skeleton while async runtime probes execute.
 */
export const getDashboardSnapshot = (): DashboardSnapshot => ({
  welcome: {
    name: "Boss",
    summary: "Agent swarm is online. Your crew is synced and awaiting the next instruction.",
  },
  stats: {
    queued: 0,
    running: 0,
    alerts: 0,
  },
  crew: [],
  health: [],
  tasks: [],
});

/**
 * Async version that probes real services
 */
export async function getDashboardSnapshotAsync(): Promise<DashboardSnapshot> {
  const [flywheelRes, theaterRes] = await Promise.all([
    fetch(`${API_BASE}/agents/runtime/flywheel`, { signal: AbortSignal.timeout(3000) }).catch(() => null),
    fetch(`${API_BASE}/agents/runtime/theater`, { signal: AbortSignal.timeout(3000) }).catch(() => null),
  ]);

  const [flywheel, theater] = await Promise.all([
    flywheelRes?.ok ? flywheelRes.json() : Promise.resolve(null),
    theaterRes?.ok ? theaterRes.json() : Promise.resolve(null),
  ]);

  const [crew, health, tasks] = await Promise.all([
    buildCrewStatus(),
    Promise.all([
      probeHealth("/health", "Dashboard Backend", "health-backend"),
      probeHealth(`${API_BASE}/agents/runtime/agents`, "ArchonX Runtime", "health-runtime"),
      probeHealth(`${API_BASE}/agents/runtime/flywheel`, "Flywheel Loop", "health-flywheel"),
    ]),
    fetchTasks(),
  ]);

  const onlineCount = crew.filter((c) => c.status === "online").length;
  const running = tasks.filter((t) => t.state === "running").length;
  const queued = tasks.filter((t) => t.state === "queued").length;
  const alerts = health.filter((h) => h.status !== "healthy").length;

  return {
    welcome: {
      name: "Boss",
      summary: `${onlineCount} agent${onlineCount !== 1 ? "s" : ""} online. ${tasks.length} tasks tracked. Flywheel cycle ${flywheel?.cycle || 'n/a'}${Array.isArray(theater?.events) ? `, theater events ${theater.events.length}` : ''}.`,
    },
    stats: { queued, running, alerts },
    crew,
    health,
    tasks,
  };
}

export async function runOnboarding(params: {
  orgId: string;
  projectId: string;
  transcript: string;
}): Promise<OnboardingRunResult> {
  const res = await fetch(`${API_BASE}/agents/runtime/onboarding`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const details = await res.text();
    throw new Error(`Onboarding failed (${res.status}): ${details}`);
  }
  return res.json() as Promise<OnboardingRunResult>;
}
