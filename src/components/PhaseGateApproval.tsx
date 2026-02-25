/**
 * PhaseGateApproval — shows the 5-phase gates and allows approve/reject.
 * Phase 3: Dashboard Control Plane
 */
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, ChevronRight } from "lucide-react";

interface PhaseGate {
  phase: number;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

const PHASE_LABELS: Record<number, string> = {
  1: "Documentation Normalization",
  2: "Governance & Contracts",
  3: "Dashboard Control Plane",
  4: "Agent Lightning Bootstrap",
  5: "Validation & Handoff",
};

const API_BASE = "/api/devika";

export default function PhaseGateApproval() {
  const [gates, setGates] = useState<PhaseGate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionPhase, setActionPhase] = useState<number | null>(null);

  const fetchGates = async () => {
    try {
      const res = await fetch(`${API_BASE}/phases`);
      if (res.ok) {
        const data = await res.json();
        setGates(data.phases || []);
      }
    } catch {
      // Offline — show static gate list
      setGates([
        { phase: 1, status: "approved", approvedBy: "system", approvedAt: "2026-02-24T00:00:00Z", notes: "Phase 1 merged to main" },
        { phase: 2, status: "pending" },
        { phase: 3, status: "pending" },
        { phase: 4, status: "pending" },
        { phase: 5, status: "pending" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGates(); }, []);

  const handleApprove = async (phase: number) => {
    setActionPhase(phase);
    try {
      const res = await fetch(`${API_BASE}/phases/${phase}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedBy: "operator", notes: "Approved via dashboard" }),
      });
      if (res.ok) await fetchGates();
    } catch {
      // Offline — update locally
      setGates((prev) =>
        prev.map((g) =>
          g.phase === phase
            ? { ...g, status: "approved", approvedBy: "operator", approvedAt: new Date().toISOString() }
            : g
        )
      );
    } finally {
      setActionPhase(null);
    }
  };

  const handleReject = async (phase: number) => {
    setActionPhase(phase);
    try {
      const res = await fetch(`${API_BASE}/phases/${phase}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectedBy: "operator", notes: "Rejected via dashboard" }),
      });
      if (res.ok) await fetchGates();
    } catch {
      setGates((prev) =>
        prev.map((g) =>
          g.phase === phase
            ? { ...g, status: "rejected", approvedBy: "operator", approvedAt: new Date().toISOString() }
            : g
        )
      );
    } finally {
      setActionPhase(null);
    }
  };

  const statusIcon = (status: PhaseGate["status"]) => {
    if (status === "approved") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    if (status === "rejected") return <XCircle className="h-4 w-4 text-rose-400" />;
    return <Clock className="h-4 w-4 text-amber-400" />;
  };

  const statusBadge = (status: PhaseGate["status"]) => {
    const map = {
      approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      rejected: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    };
    return `border text-xs ${map[status]}`;
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader><CardTitle className="text-sm">Phase Gates</CardTitle></CardHeader>
        <CardContent><p className="text-xs text-muted-foreground">Loading...</p></CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ChevronRight className="h-4 w-4 text-primary" />
          Phase Gate Approvals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {gates.map((gate) => (
          <div
            key={gate.phase}
            className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3"
          >
            <div className="flex items-center gap-3">
              {statusIcon(gate.status)}
              <div>
                <p className="text-sm font-medium">
                  Phase {gate.phase}: {PHASE_LABELS[gate.phase]}
                </p>
                {gate.approvedAt && (
                  <p className="text-xs text-muted-foreground">
                    {gate.status === "approved" ? "Approved" : "Rejected"} by {gate.approvedBy} ·{" "}
                    {new Date(gate.approvedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusBadge(gate.status)}>{gate.status}</Badge>
              {gate.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    disabled={actionPhase === gate.phase}
                    onClick={() => handleApprove(gate.phase)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                    disabled={actionPhase === gate.phase}
                    onClick={() => handleReject(gate.phase)}
                  >
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
