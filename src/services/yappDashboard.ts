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

export const getDashboardSnapshot = (): DashboardSnapshot => ({
  welcome: {
    name: "Cody",
    summary: "Agent Zero is ready. Your crew is synced and awaiting the next YAP instruction.",
  },
  stats: {
    queued: 18,
    running: 4,
    alerts: 1,
  },
  crew: [
    {
      id: "az-core",
      name: "Agent Zero",
      role: "Orchestrator",
      status: "online",
      focus: "Coordinating task queue",
      lastSeen: "Just now",
    },
    {
      id: "az-research",
      name: "Beacon",
      role: "Research",
      status: "idle",
      focus: "Monitoring signals",
      lastSeen: "4 min ago",
    },
    {
      id: "az-build",
      name: "Forge",
      role: "Builder",
      status: "online",
      focus: "Shipping UI assets",
      lastSeen: "2 min ago",
    },
    {
      id: "az-watch",
      name: "Pulse",
      role: "Ops",
      status: "offline",
      focus: "Maintenance window",
      lastSeen: "22 min ago",
    },
  ],
  health: [
    {
      id: "health-api",
      label: "API /health",
      status: "healthy",
      detail: "Stable latency · 120ms",
      percent: 92,
    },
    {
      id: "health-queue",
      label: "Task Queue",
      status: "degraded",
      detail: "Backlog spike · 8 items",
      percent: 68,
    },
    {
      id: "health-registry",
      label: "Agent Registry",
      status: "healthy",
      detail: "4 active agents",
      percent: 88,
    },
  ],
  tasks: [
    {
      id: "task-914",
      title: "Summarize overnight incident logs",
      state: "running",
      owner: "Agent Zero",
      eta: "3 min",
      tags: ["ops", "summaries"],
    },
    {
      id: "task-913",
      title: "Draft YAPP onboarding flow",
      state: "queued",
      owner: "Forge",
      eta: "12 min",
      tags: ["ui", "onboarding"],
    },
    {
      id: "task-912",
      title: "Validate agent registry heartbeat",
      state: "done",
      owner: "Beacon",
      eta: "Complete",
      tags: ["health", "registry"],
    },
    {
      id: "task-911",
      title: "Investigate queue lag alert",
      state: "blocked",
      owner: "Pulse",
      eta: "Waiting",
      tags: ["queue", "alert"],
    },
  ],
});
