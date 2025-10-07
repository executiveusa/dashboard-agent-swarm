import { TaskMonitor } from "@/components/TaskMonitor";
import { WorkflowHistoryPanel } from "@/components/WorkflowHistoryPanel";

const Tasks = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Tasks
          </h1>
          <p className="text-muted-foreground">
            Monitor and manage all agent tasks
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <TaskMonitor />
          <WorkflowHistoryPanel />
        </div>
      </div>
    </div>
  );
};

export default Tasks;