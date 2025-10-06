import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

interface Task {
  id: string;
  created_at: string;
  task_type: string;
  status: string;
  progress: number;
  model_used: string | null;
}

export function TaskMonitor() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    // Fetch initial tasks
    const fetchTasks = async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (data) setTasks(data);
    };

    fetchTasks();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTasks((prev) => [payload.new as Task, ...prev].slice(0, 10));
          } else if (payload.eventType === "UPDATE") {
            setTasks((prev) =>
              prev.map((task) =>
                task.id === payload.new.id ? (payload.new as Task) : task
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "running":
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      running: "secondary",
      failed: "destructive",
      pending: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="font-mono text-xs">
        {status}
      </Badge>
    );
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
        Live Task Monitor
      </h2>
      
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No tasks yet</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-primary/50 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(task.status)}
                  <div>
                    <p className="font-semibold">{task.task_type}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {new Date(task.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                {getStatusBadge(task.status)}
              </div>
              
              {task.status === "running" && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-mono text-primary">{task.progress}%</span>
                  </div>
                  <Progress value={task.progress} className="h-2" />
                </div>
              )}
              
              {task.model_used && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Model: <span className="font-mono text-accent">{task.model_used}</span>
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}