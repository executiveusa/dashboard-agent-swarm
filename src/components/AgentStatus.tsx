import { Activity, Cpu, DollarSign, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface StatusData {
  agentsOnline: number;
  model: string;
  tokensUsed: string;
  costToday: string;
  status: "active" | "degraded" | "offline";
}

export function AgentStatus() {
  const [data, setData] = useState<StatusData>({
    agentsOnline: 0,
    model: "claude-sonnet-4-6",
    tokensUsed: "—",
    costToday: "—",
    status: "active",
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/devika/telemetry");
        if (res.ok) {
          const telemetry = await res.json();
          const totalRuns: number = (telemetry.passed ?? 0) + (telemetry.failed ?? 0);
          const failRate = totalRuns > 0 ? telemetry.failed / totalRuns : 0;
          setData({
            agentsOnline: telemetry.agentsOnline ?? 2,
            model: telemetry.model ?? "claude-sonnet-4-6",
            tokensUsed: totalRuns > 0 ? `${totalRuns} runs` : "idle",
            costToday: telemetry.costToday ?? "—",
            status: failRate > 0.5 ? "degraded" : "active",
          });
        }
      } catch {
        // server offline — keep last known values
      }
    };

    fetchStatus();
    const id = setInterval(fetchStatus, 30_000);
    return () => clearInterval(id);
  }, []);

  const statusColor =
    data.status === "active" ? "text-green-500" :
    data.status === "degraded" ? "text-amber-500" :
    "text-red-500";

  const dotColor =
    data.status === "active" ? "bg-green-500" :
    data.status === "degraded" ? "bg-amber-500" :
    "bg-red-500";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-md bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Agent Zero</p>
            <p className={`text-2xl font-bold ${statusColor} flex items-center gap-2`}>
              {data.status === "active" ? "Active" : data.status === "degraded" ? "Degraded" : "Offline"}
              <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-md bg-secondary">
            <Cpu className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Model</p>
            <p className="text-sm font-mono font-semibold truncate max-w-[140px]">{data.model}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-md bg-amber-500/10">
            <Zap className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Agents Online</p>
            <p className="text-2xl font-bold font-mono">{data.agentsOnline}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-md bg-green-500/10">
            <DollarSign className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Runs Today</p>
            <p className="text-2xl font-bold font-mono">{data.tokensUsed}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
