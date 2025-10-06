import { AgentStatus } from "@/components/AgentStatus";
import { TaskMonitor } from "@/components/TaskMonitor";
import { CommandInput } from "@/components/CommandInput";
import { LogsViewer } from "@/components/LogsViewer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Desktop Control Agent
          </h1>
          <p className="text-muted-foreground">
            Autonomous AI-powered desktop automation and file management
          </p>
        </div>

        <AgentStatus />
        
        <div className="grid gap-6 lg:grid-cols-2">
          <TaskMonitor />
          <LogsViewer />
        </div>

        <CommandInput />
      </div>
    </div>
  );
};

export default Index;