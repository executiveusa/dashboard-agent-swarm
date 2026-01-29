import { Activity, Target, Cpu, Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AgentSession } from "@/services/cynthiaTelemetry";

interface CynthiaStateCardProps {
  session: AgentSession | null;
  isLive?: boolean;
}

export function CynthiaStateCard({ session, isLive = false }: CynthiaStateCardProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "paused":
        return "bg-yellow-500";
      case "failed":
        return "bg-red-500";
      case "completed":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status?: string) => {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
  };

  if (!session) {
    return (
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-muted/20">
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No active session</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Status Card */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/20">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Status</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xl font-bold">{getStatusText(session.status)}</p>
              <span
                className={`inline-block w-2 h-2 rounded-full ${getStatusColor(
                  session.status
                )} ${session.status === "active" ? "animate-pulse" : ""}`}
              />
              {isLive && (
                <Badge variant="outline" className="ml-auto text-xs">
                  LIVE
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Mode Card */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-accent/20">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-accent/20">
            <Settings className="h-6 w-6 text-accent" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Mode</p>
            <p className="text-xl font-semibold">
              {session.mode || "Standard"}
            </p>
          </div>
        </div>
      </Card>

      {/* Model Card */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-purple/20">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-purple/20">
            <Cpu className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Model</p>
            <p className="text-lg font-mono font-semibold">
              {session.model || "N/A"}
            </p>
          </div>
        </div>
      </Card>

      {/* Goal Card */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-success/20">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-success/20">
            <Target className="h-6 w-6 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">Current Goal</p>
            <p className="text-sm font-medium truncate" title={session.goal}>
              {session.goal || "No goal set"}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
