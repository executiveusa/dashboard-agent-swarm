import { TaskMonitor } from "@/components/TaskMonitor";
import { CommandInput } from "@/components/CommandInput";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal } from "lucide-react";

const Tasks = () => {
  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide uppercase text-primary font-heading">
            Tasks
          </p>
          <h2 className="mt-1 text-2xl font-semibold font-heading">Agent Task Queue</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            See what your swarms are working on and queue new missions.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <CommandInput />
          <TaskMonitor />
        </div>
        <div className="space-y-4">
          <Card className="border-border ">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-lg">
                <Terminal className="h-4 w-4 text-accent" />
                Task Templates
              </CardTitle>
              <CardDescription>
                Quick actions for common workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <button className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-left text-sm transition-all hover:border-primary/30 hover:bg-muted/30">
                  <div className="font-medium">Generate Blueprint</div>
                  <div className="text-xs text-muted-foreground">Create new project</div>
                </button>
                <button className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-left text-sm transition-all hover:border-primary/30 hover:bg-muted/30">
                  <div className="font-medium">UGC Pack</div>
                  <div className="text-xs text-muted-foreground">Generate content strategy</div>
                </button>
                <button className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-left text-sm transition-all hover:border-primary/30 hover:bg-muted/30">
                  <div className="font-medium">Donor Thank You</div>
                  <div className="text-xs text-muted-foreground">Personalized outreach</div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Tasks;