import { TaskMonitor } from "@/components/TaskMonitor";

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

        <TaskMonitor />
      </div>
    </div>
  );
};

export default Tasks;