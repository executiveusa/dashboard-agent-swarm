/**
 * ControlDashboard — master Phase 3 control plane page.
 * Combines: Devika-PI telemetry, Phase Gate Approvals, Multi-Repo Build Status.
 */
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, XCircle, Layers } from "lucide-react";
import PhaseGateApproval from "@/components/PhaseGateApproval";
import RepoStatus from "@/components/RepoStatus";

interface TelemetrySummary {
  totalExecutions: number;
  passed: number;
  failed: number;
  passRate: number;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  beadId: string;
  stage: string;
  result: string;
}

interface TelemetryData {
  summary: TelemetrySummary;
  recentActivity: AuditEntry[];
  timestamp: string;
}

const API_BASE = "/api/devika";

export default function ControlDashboard() {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch(`${API_BASE}/telemetry`);
        if (res.ok) setTelemetry(await res.json());
      } catch {
        setTelemetry({
          summary: { totalExecutions: 0, passed: 0, failed: 0, passRate: 0 },
          recentActivity: [],
          timestamp: new Date().toISOString(),
        });
      }
    };
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 30_000);
    return () => clearInterval(interval);
  }, []);

  const resultBadge = (result: string) => {
    if (result === "PASS" || result === "APPROVED") {
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    }
    if (result === "FAIL" || result === "REJECTED") {
      return "bg-rose-500/15 text-rose-400 border-rose-500/30";
    }
    return "bg-slate-500/15 text-slate-400 border-slate-500/30";
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold tracking-wide uppercase text-primary font-heading">
          ARCHONX OS
        </p>
        <h2 className="mt-1 text-2xl font-semibold font-heading flex items-center gap-2">
          <Layers className="h-6 w-6 text-primary" />
          Control Dashboard
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Phase 3 — Human control plane for governance, phase gates, and multi-repo build status.
        </p>
      </header>

      {/* Telemetry summary cards */}
      {telemetry && (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            {
              label: "Total Executions",
              value: telemetry.summary.totalExecutions,
              icon: Activity,
              color: "text-sky-400",
            },
            {
              label: "Passed",
              value: telemetry.summary.passed,
              icon: CheckCircle2,
              color: "text-emerald-400",
            },
            {
              label: "Failed",
              value: telemetry.summary.failed,
              icon: XCircle,
              color: "text-rose-400",
            },
            {
              label: "Pass Rate",
              value: `${telemetry.summary.passRate}%`,
              icon: Activity,
              color: "text-amber-400",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-border">
              <CardContent className="flex items-center gap-3 p-4">
                <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-semibold font-mono">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Phase Gate Approvals */}
      <PhaseGateApproval />

      {/* Multi-Repo Build Status */}
      <RepoStatus />

      {/* Recent Audit Activity */}
      {telemetry && telemetry.recentActivity.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Recent Audit Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {telemetry.recentActivity.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground">{entry.beadId}</p>
                      <p className="text-sm">{entry.action}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <Badge className={`border text-xs ${resultBadge(entry.result)}`}>
                      {entry.result}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {telemetry && telemetry.recentActivity.length === 0 && (
        <Card className="border-border">
          <CardContent className="p-6 text-center">
            <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No Devika-PI executions logged yet. Run a task from the{" "}
              <a href="/devika" className="text-primary underline">Devika Agent</a> page.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
