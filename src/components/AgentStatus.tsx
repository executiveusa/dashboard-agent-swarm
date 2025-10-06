import { Activity, Cpu, DollarSign, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AgentStatus() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/20">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="text-2xl font-bold text-success flex items-center gap-2">
              Active
              <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse-glow" />
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-accent/20">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-accent/20">
            <Cpu className="h-6 w-6 text-accent" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Model</p>
            <p className="text-xl font-mono font-semibold">GPT-4.1</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-warning/20">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-warning/20">
            <Zap className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tokens Used</p>
            <p className="text-2xl font-bold font-mono">47.2K</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-success/20">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-success/20">
            <DollarSign className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Cost Today</p>
            <p className="text-2xl font-bold font-mono">$0.42</p>
          </div>
        </div>
      </Card>
    </div>
  );
}