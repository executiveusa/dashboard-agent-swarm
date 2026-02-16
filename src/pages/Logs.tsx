import { LogsViewer } from "@/components/LogsViewer";
import { FileText } from "lucide-react";

const Logs = () => {
  return (
    <div className="space-y-6 p-6">
      <header>
        <p className="text-xs font-semibold tracking-wide uppercase text-primary font-heading">
          Logs
        </p>
        <h2 className="mt-1 text-2xl font-semibold font-heading">System Logs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Watch your agents, workflows, and webhooks in real time.
        </p>
      </header>

      <LogsViewer />
    </div>
  );
};

export default Logs;