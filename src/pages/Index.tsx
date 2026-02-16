import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Activity,
  Bot,
  CheckCircle2,
  Clock,
  HeartPulse,
  ShieldAlert,
  Sparkles,
  Zap,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { getDashboardSnapshotAsync, getDashboardSnapshot } from "@/services/yappDashboard";
import type { DashboardSnapshot } from "@/services/yappDashboard";

const statusBadgeStyles: Record<string, string> = {
  online: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  idle: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  offline: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  healthy: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  degraded: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  down: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  queued: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  running: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  blocked: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  done: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const Index = () => {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(getDashboardSnapshot());
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getDashboardSnapshotAsync();
      setSnapshot(data);
      setIsLive(true);
    } catch {
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                YAPP Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">
                Welcome back, {snapshot.welcome.name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                {snapshot.welcome.summary}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={`gap-1 border ${isLive ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}`}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isLive ? "Live sync" : "Fallback data"}
              </Badge>
              <Badge className="gap-1 border border-sky-500/30 bg-sky-500/10 text-sky-300">
                <Sparkles className="h-3.5 w-3.5" />
                Agent swarm
              </Badge>
              <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          <Card className="border-border/60 bg-card/70 shadow-lg shadow-primary/5">
            <CardHeader className="gap-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                Today at a glance
              </CardTitle>
              <CardDescription>
                Quick pulse on your agents, queue, and active alerts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border/50 bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Tasks queued
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {snapshot.stats.queued}
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Running now
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {snapshot.stats.running}
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Active alerts
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {snapshot.stats.alerts}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <Card className="border-border/60 bg-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5 text-primary" />
                  Task feed
                </CardTitle>
                <CardDescription>
                  Live queue updates from Agent Zero and the crew.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {snapshot.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {task.title}
                        </p>
                        <Badge
                          className={`border text-[0.65rem] uppercase tracking-wide ${
                            statusBadgeStyles[task.state]
                          }`}
                        >
                          {task.state}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Owner: {task.owner} · ETA: {task.eta}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {task.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[0.65rem] text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button variant="secondary" className="w-full sm:w-auto">
                      View
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bot className="h-5 w-5 text-primary" />
                  YAP input
                </CardTitle>
                <CardDescription>
                  Send concise instructions for Agent Zero to execute.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Describe the task, desired outcome, and urgency..."
                  className="min-h-[120px] resize-none"
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {["Summarize logs", "Spin up research", "Draft reply"].map(
                      (prompt) => (
                        <button
                          key={prompt}
                          className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                          type="button"
                        >
                          {prompt}
                        </button>
                      )
                    )}
                  </div>
                  <Button className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Send YAP
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border/60 bg-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HeartPulse className="h-5 w-5 text-primary" />
                  System health
                </CardTitle>
                <CardDescription>
                  Status from /health, queue, and registry endpoints.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {snapshot.health.map((check) => (
                  <div key={check.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {check.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {check.detail}
                        </p>
                      </div>
                      <Badge
                        className={`border text-[0.65rem] uppercase tracking-wide ${
                          statusBadgeStyles[check.status]
                        }`}
                      >
                        {check.status}
                      </Badge>
                    </div>
                    <Progress value={check.percent} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bot className="h-5 w-5 text-primary" />
                  Crew status
                </CardTitle>
                <CardDescription>
                  Active agents synced from the registry.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {snapshot.crew.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {member.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.role} · {member.lastSeen}
                        </p>
                      </div>
                      <Badge
                        className={`border text-[0.65rem] uppercase tracking-wide ${
                          statusBadgeStyles[member.status]
                        }`}
                      >
                        {member.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Focus: {member.focus}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {member.lastSeen}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldAlert className="h-5 w-5 text-primary" />
                  Safety checks
                </CardTitle>
                <CardDescription>
                  Governance guardrails for critical actions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/40 px-3 py-2">
                  <span>Human approval required</span>
                  <Badge className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                    Enabled
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/40 px-3 py-2">
                  <span>Budget limits</span>
                  <Badge className="border border-slate-500/30 bg-slate-500/10 text-slate-300">
                    $5k cap
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/40 px-3 py-2">
                  <span>Security posture</span>
                  <Badge className="border border-amber-500/30 bg-amber-500/10 text-amber-300">
                    Review
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
