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
  Send,
  Zap,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { getDashboardSnapshotAsync, getDashboardSnapshot } from "@/services/yappDashboard";
import type { DashboardSnapshot } from "@/services/yappDashboard";

const statusBadgeStyles: Record<string, string> = {
  online: "bg-green-500/10 text-green-500 border-green-500/20",
  idle: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  offline: "bg-muted text-muted-foreground border-border",
  healthy: "bg-green-500/10 text-green-500 border-green-500/20",
  degraded: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  down: "bg-red-500/10 text-red-500 border-red-500/20",
  queued: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  running: "bg-green-500/10 text-green-500 border-green-500/20",
  blocked: "bg-red-500/10 text-red-500 border-red-500/20",
  done: "bg-muted text-muted-foreground border-border",
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Header */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Welcome back, {snapshot.welcome.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {snapshot.welcome.summary}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`gap-1 ${isLive ? "text-green-500 border-green-500/20" : "text-amber-500 border-amber-500/20"}`}>
              <CheckCircle2 className="h-3 w-3" />
              {isLive ? "Live" : "Fallback"}
            </Badge>
            <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tasks Queued
              </p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {snapshot.stats.queued}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Running Now
              </p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {snapshot.stats.running}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Active Alerts
              </p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {snapshot.stats.alerts}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Main Content */}
      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {/* Task Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-primary" />
                Task Feed
              </CardTitle>
              <CardDescription>
                Live queue updates from the agent fleet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {snapshot.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-col gap-3 rounded-md border border-border bg-secondary/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {task.title}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[0.65rem] uppercase tracking-wide ${
                          statusBadgeStyles[task.state]
                        }`}
                      >
                        {task.state}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Owner: {task.owner} · ETA: {task.eta}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {task.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-border bg-background px-2 py-0.5 text-[0.65rem] text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                    View
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Command Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-4 w-4 text-primary" />
                Command Input
              </CardTitle>
              <CardDescription>
                Send instructions to Agent Zero.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe the task, desired outcome, and urgency..."
                className="min-h-[100px] resize-none bg-background"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {["Summarize logs", "Research topic", "Draft reply"].map(
                    (prompt) => (
                      <button
                        key={prompt}
                        className="rounded border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        type="button"
                      >
                        {prompt}
                      </button>
                    )
                  )}
                </div>
                <Button size="sm" className="gap-2">
                  <Send className="h-3.5 w-3.5" />
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HeartPulse className="h-4 w-4 text-primary" />
                System Health
              </CardTitle>
              <CardDescription>
                Service status and response times.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {snapshot.health.map((check) => (
                <div key={check.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {check.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {check.detail}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[0.65rem] uppercase tracking-wide ${
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

          {/* Crew Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-4 w-4 text-primary" />
                Crew Status
              </CardTitle>
              <CardDescription>
                Active agents from the registry.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {snapshot.crew.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col gap-2 rounded-md border border-border bg-secondary/50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {member.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.role}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[0.65rem] uppercase tracking-wide ${
                        statusBadgeStyles[member.status]
                      }`}
                    >
                      {member.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Focus: {member.focus}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {member.lastSeen}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Safety Checks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Safety Checks
              </CardTitle>
              <CardDescription>
                Governance guardrails for critical actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-md border border-border bg-secondary/50 px-3 py-2">
                <span className="text-muted-foreground">Human approval required</span>
                <Badge variant="outline" className="text-green-500 border-green-500/20">
                  Enabled
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-secondary/50 px-3 py-2">
                <span className="text-muted-foreground">Budget limits</span>
                <Badge variant="outline">
                  $5k cap
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-secondary/50 px-3 py-2">
                <span className="text-muted-foreground">Security posture</span>
                <Badge variant="outline" className="text-amber-500 border-amber-500/20">
                  Review
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Index;
