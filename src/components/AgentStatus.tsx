import { Activity, Cpu, DollarSign, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AgentStatus() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-md bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="text-2xl font-bold text-green-500 flex items-center gap-2">
              Active
              <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
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
            <p className="text-xl font-mono font-semibold">GPT-4.1</p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-md bg-amber-500/10">
            <Zap className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tokens Used</p>
            <p className="text-2xl font-bold font-mono">47.2K</p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-md bg-green-500/10">
            <DollarSign className="h-5 w-5 text-green-500" />
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