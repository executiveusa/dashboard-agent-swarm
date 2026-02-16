/**
 * AnimatedCommandCenter.tsx
 * Full animated dashboard for controlling all agents with real-time status,
 * pulsing indicators, staggered card animations, and live WebSocket feeds.
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronRight,
  Code2,
  Container,
  Eye,
  Globe,
  Loader2,
  MessageSquare,
  Play,
  Power,
  RefreshCw,
  Rocket,
  RotateCcw,
  Shield,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getDashboardSnapshotAsync, getDashboardSnapshot } from "@/services/yappDashboard";
import type { DashboardSnapshot } from "@/services/yappDashboard";
import { getInfrastructureAgents } from "@/services/agentRegistry";

// ─── Motion Variants ───────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 22 },
  },
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.15, 1],
    opacity: [0.7, 1, 0.7],
    transition: { repeat: Infinity, duration: 2, ease: "easeInOut" },
  },
};

const statusColors: Record<string, string> = {
  online: "#10b981",
  idle: "#f59e0b",
  offline: "#64748b",
  healthy: "#10b981",
  degraded: "#f59e0b",
  down: "#ef4444",
  running: "#10b981",
  stopped: "#ef4444",
  concept: "#8b5cf6",
  checking: "#3b82f6",
};

const agentIconMap: Record<string, any> = {
  agent_zero: Terminal,
  devika: Code2,
  pauli: MessageSquare,
  alex: Rocket,
  bambu_lab: Container,
  cynthia: Eye,
};

interface AgentControlState {
  id: string;
  name: string;
  status: "online" | "offline" | "checking" | "running" | "stopped" | "concept";
  action: "idle" | "starting" | "stopping" | "restarting";
  lastPing: number;
  focus?: string;
}

const AnimatedCommandCenter = () => {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(getDashboardSnapshot());
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentControlState[]>([]);
  const [commandLog, setCommandLog] = useState<Array<{ ts: string; msg: string; type: "info" | "success" | "error" }>>([]);

  // Initialize agent states from registry
  useEffect(() => {
    const infraAgents = getInfrastructureAgents();
    const initialStates: AgentControlState[] = infraAgents.map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status === "active" ? "checking" : a.status === "concept" ? "concept" : "offline",
      action: "idle" as const,
      lastPing: Date.now(),
    }));
    setAgents(initialStates);
  }, []);

  const addLog = useCallback(
    (msg: string, type: "info" | "success" | "error" = "info") => {
      setCommandLog((prev) => [
        { ts: new Date().toLocaleTimeString(), msg, type },
        ...prev.slice(0, 49),
      ]);
    },
    []
  );

  // Probe health for all agents
  const probeAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDashboardSnapshotAsync();
      setSnapshot(data);
      setIsLive(true);
      addLog("Dashboard sync complete — live data", "success");

      // Update agent states from crew data
      setAgents((prev) =>
        prev.map((agent) => {
          const crewMatch = data.crew.find(
            (c) => c.id === agent.id || c.name.toLowerCase().includes(agent.name.toLowerCase().split(" ")[0])
          );
          return {
            ...agent,
            status: crewMatch
              ? crewMatch.status === "online"
                ? "online"
                : crewMatch.status === "idle"
                ? "online"
                : "offline"
              : agent.status === "concept"
              ? "concept"
              : "offline",
            lastPing: Date.now(),
            focus: crewMatch?.focus,
          };
        })
      );
    } catch {
      setIsLive(false);
      addLog("Sync failed — using fallback data", "error");
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  useEffect(() => {
    probeAll();
    const iv = setInterval(probeAll, 15000);
    return () => clearInterval(iv);
  }, [probeAll]);

  // Agent control actions
  const handleAgentAction = async (
    agentId: string,
    action: "start" | "stop" | "restart"
  ) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId
          ? { ...a, action: action === "start" ? "starting" : action === "stop" ? "stopping" : "restarting" }
          : a
      )
    );
    addLog(`${action.toUpperCase()} → ${agentId}`, "info");

    try {
      const res = await fetch(`/api/agents/${agentId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${action} agent`,
          action,
        }),
      });

      if (res.ok) {
        addLog(`${agentId} ${action} succeeded`, "success");
        setAgents((prev) =>
          prev.map((a) =>
            a.id === agentId
              ? {
                  ...a,
                  status: action === "stop" ? "stopped" : "online",
                  action: "idle",
                  lastPing: Date.now(),
                }
              : a
          )
        );
      } else {
        throw new Error(`${res.status}`);
      }
    } catch (err: any) {
      addLog(`${agentId} ${action} failed: ${err.message}`, "error");
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, action: "idle" } : a))
      );
    }
  };

  const agentPageMap: Record<string, string> = {
    devika: "/agents/devika",
    pauli: "/agents/meetings",
    alex: "/deploy",
    cynthia: "/cynthia",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-slate-950 to-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        {/* ─── Animated Header ────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <motion.div
              animate={pulseVariants.pulse}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20"
            >
              <Zap className="h-6 w-6 text-primary" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Command Center
              </h1>
              <p className="text-sm text-muted-foreground">
                Control all agents in real-time
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AnimatePresence>
              {isLive && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Badge className="gap-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                    <motion.span
                      animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="inline-block h-2 w-2 rounded-full bg-emerald-400"
                    />
                    Live
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
            <Badge className="gap-1 border border-sky-500/30 bg-sky-500/10 text-sky-300">
              <Sparkles className="h-3.5 w-3.5" />
              {agents.filter((a) => a.status === "online" || a.status === "running").length} agents active
            </Badge>
            <Button variant="ghost" size="sm" onClick={probeAll} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </motion.header>

        {/* ─── Agent Grid ─────────────────────────────────── */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {agents.map((agent) => {
            const Icon = agentIconMap[agent.id] || Bot;
            const color = statusColors[agent.status] || statusColors.offline;
            const isActive = agent.status === "online" || agent.status === "running";
            const isBusy = agent.action !== "idle";

            return (
              <motion.div
                key={agent.id}
                variants={cardVariants}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
                layout
              >
                <Card
                  className={`relative overflow-hidden border transition-all duration-300 ${
                    selectedAgent === agent.id
                      ? "border-primary/50 bg-card/90 shadow-lg shadow-primary/10"
                      : "border-border  hover:border-border"
                  } ${agent.status === "concept" ? "opacity-60" : ""}`}
                  onClick={() => setSelectedAgent(agent.id === selectedAgent ? null : agent.id)}
                >
                  {/* Animated gradient border glow for active agents */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-lg"
                      animate={{
                        boxShadow: [
                          `inset 0 0 0 1px ${color}30`,
                          `inset 0 0 0 1px ${color}60`,
                          `inset 0 0 0 1px ${color}30`,
                        ],
                      }}
                      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    />
                  )}

                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="flex h-10 w-10 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${color}20` }}
                          animate={
                            isActive
                              ? {
                                  backgroundColor: [`${color}15`, `${color}30`, `${color}15`],
                                }
                              : {}
                          }
                          transition={isActive ? { repeat: Infinity, duration: 3 } : {}}
                        >
                          <Icon className="h-5 w-5" style={{ color }} />
                        </motion.div>
                        <div>
                          <CardTitle className="text-sm font-semibold">{agent.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {agent.focus || agent.id}
                          </p>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div className="flex items-center gap-2">
                        <motion.div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: color }}
                          animate={
                            isActive
                              ? { scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }
                              : {}
                          }
                          transition={isActive ? { repeat: Infinity, duration: 2 } : {}}
                        />
                        <span className="text-xs capitalize text-muted-foreground">
                          {isBusy ? agent.action : agent.status}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Expanded controls */}
                  <AnimatePresence>
                    {selectedAgent === agent.id && agent.status !== "concept" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <CardContent className="space-y-3 pt-0">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-1.5 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAgentAction(agent.id, "start");
                              }}
                              disabled={isBusy || isActive}
                            >
                              {agent.action === "starting" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Play className="h-3.5 w-3.5" />
                              )}
                              Start
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-1.5 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAgentAction(agent.id, "restart");
                              }}
                              disabled={isBusy}
                            >
                              {agent.action === "restarting" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                              )}
                              Restart
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-1.5 text-xs text-rose-400 hover:bg-rose-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAgentAction(agent.id, "stop");
                              }}
                              disabled={isBusy || !isActive}
                            >
                              {agent.action === "stopping" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Power className="h-3.5 w-3.5" />
                              )}
                              Stop
                            </Button>
                          </div>
                          {agentPageMap[agent.id] && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="w-full gap-1.5 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(agentPageMap[agent.id]);
                              }}
                            >
                              Open Agent Panel
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </motion.section>

        {/* ─── Stats + Logs Row ───────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Quick stats */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card className="border-border ">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-primary" />
                  System Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Queued", value: snapshot.stats.queued, color: "#3b82f6" },
                    { label: "Running", value: snapshot.stats.running, color: "#10b981" },
                    { label: "Alerts", value: snapshot.stats.alerts, color: "#f59e0b" },
                  ].map((stat) => (
                    <motion.div
                      key={stat.label}
                      className="rounded-lg border border-border/40 bg-muted/30 p-3 text-center"
                      whileHover={{ scale: 1.05 }}
                    >
                      <motion.p
                        className="text-2xl font-bold"
                        style={{ color: stat.color }}
                        key={stat.value}
                        initial={{ scale: 1.3, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {stat.value}
                      </motion.p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Health bars */}
                <div className="space-y-3">
                  {snapshot.health.slice(0, 4).map((check, i) => (
                    <motion.div
                      key={check.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">
                          {check.label}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[0.6rem]"
                          style={{
                            borderColor: `${statusColors[check.status]}40`,
                            color: statusColors[check.status],
                          }}
                        >
                          {check.status}
                        </Badge>
                      </div>
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.6 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                        style={{ transformOrigin: "left" }}
                      >
                        <Progress value={check.percent} className="h-1.5" />
                      </motion.div>
                    </motion.div>
                  ))}
                </div>

                {/* Task feed — compact */}
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Active Tasks
                  </p>
                  <AnimatePresence mode="popLayout">
                    {snapshot.tasks.slice(0, 3).map((task) => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <motion.div
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              backgroundColor: statusColors[task.state] || "#64748b",
                            }}
                            animate={
                              task.state === "running"
                                ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }
                                : {}
                            }
                            transition={{ repeat: Infinity, duration: 1.5 }}
                          />
                          <span className="text-xs font-medium text-foreground">
                            {task.title}
                          </span>
                        </div>
                        <span className="text-[0.6rem] text-muted-foreground">
                          {task.owner}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Command log */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Card className="border-border ">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Terminal className="h-4 w-4 text-primary" />
                  Command Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[320px] space-y-1 overflow-y-auto rounded-lg bg-slate-950/80 p-3 font-mono text-xs">
                  {commandLog.length === 0 ? (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.5 }}
                      className="text-slate-500"
                    >
                      Waiting for commands...
                    </motion.p>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {commandLog.map((entry, i) => (
                        <motion.div
                          key={`${entry.ts}-${i}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex gap-2"
                        >
                          <span className="text-slate-600">{entry.ts}</span>
                          <span
                            className={
                              entry.type === "success"
                                ? "text-emerald-400"
                                : entry.type === "error"
                                ? "text-rose-400"
                                : "text-sky-400"
                            }
                          >
                            {entry.type === "success" ? "✓" : entry.type === "error" ? "✗" : "►"}
                          </span>
                          <span className="text-slate-300">{entry.msg}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ─── Network Topology (miniature) ───────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="border-border ">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4 text-primary" />
                Agent Network
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mx-auto h-48 w-full max-w-2xl">
                {/* Center hub */}
                <motion.div
                  className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary/20"
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(139, 92, 246, 0)",
                      "0 0 0 12px rgba(139, 92, 246, 0.15)",
                      "0 0 0 0 rgba(139, 92, 246, 0)",
                    ],
                  }}
                  transition={{ repeat: Infinity, duration: 3 }}
                >
                  <Shield className="h-7 w-7 text-primary" />
                </motion.div>

                {/* Orbiting agents */}
                {agents.map((agent, i) => {
                  const angle = (i / agents.length) * Math.PI * 2 - Math.PI / 2;
                  const radius = 80;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;
                  const isActive = agent.status === "online" || agent.status === "running";
                  const color = statusColors[agent.status] || "#64748b";
                  const Icon = agentIconMap[agent.id] || Bot;

                  return (
                    <motion.div
                      key={agent.id}
                      className="absolute left-1/2 top-1/2 flex items-center justify-center"
                      style={{
                        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                      }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 + i * 0.1, type: "spring" }}
                    >
                      {/* Connection line */}
                      <svg
                        className="pointer-events-none absolute"
                        style={{
                          width: Math.abs(x) + 20,
                          height: Math.abs(y) + 20,
                          left: x > 0 ? -x : 0,
                          top: y > 0 ? -y : 0,
                        }}
                      >
                        <motion.line
                          x1={x > 0 ? x : 0}
                          y1={y > 0 ? y : 0}
                          x2={x > 0 ? 0 : Math.abs(x)}
                          y2={y > 0 ? 0 : Math.abs(y)}
                          stroke={color}
                          strokeWidth={isActive ? 1.5 : 0.5}
                          strokeDasharray={isActive ? "none" : "4 4"}
                          strokeOpacity={isActive ? 0.5 : 0.2}
                          animate={
                            isActive
                              ? { strokeOpacity: [0.3, 0.7, 0.3] }
                              : {}
                          }
                          transition={{ repeat: Infinity, duration: 2 }}
                        />
                      </svg>

                      <motion.div
                        className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border"
                        style={{
                          borderColor: `${color}50`,
                          backgroundColor: `${color}15`,
                        }}
                        animate={
                          isActive
                            ? {
                                boxShadow: [
                                  `0 0 0 0 ${color}00`,
                                  `0 0 8px 2px ${color}30`,
                                  `0 0 0 0 ${color}00`,
                                ],
                              }
                            : {}
                        }
                        transition={{ repeat: Infinity, duration: 3, delay: i * 0.3 }}
                        title={`${agent.name} — ${agent.status}`}
                      >
                        <Icon className="h-4 w-4" style={{ color }} />
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                {agents.map((a) => (
                  <div key={a.id} className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: statusColors[a.status] }}
                    />
                    {a.name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </div>
  );
};

export default AnimatedCommandCenter;
