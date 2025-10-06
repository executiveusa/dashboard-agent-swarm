import { LogsViewer } from "@/components/LogsViewer";

const Logs = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            System Logs
          </h1>
          <p className="text-muted-foreground">
            View detailed system logs and activity
          </p>
        </div>

        <LogsViewer />
      </div>
    </div>
  );
};

export default Logs;