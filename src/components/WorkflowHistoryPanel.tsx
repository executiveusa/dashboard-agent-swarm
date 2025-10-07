import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Loader2, RefreshCw } from "lucide-react";

type WorkflowRunRow = Database["public"]["Tables"]["workflow_runs"]["Row"] & {
  workflow_steps: Database["public"]["Tables"]["workflow_steps"]["Row"][];
};

type HistoryState = {
  loading: boolean;
  runs: WorkflowRunRow[];
  error?: string;
  retryingRunId?: string;
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  succeeded: "default",
  running: "secondary",
  failed: "destructive",
  pending: "outline",
};

/**
 * Render a panel showing recent workflow runs, their steps, artifacts, and controls.
 *
 * Fetches the latest workflow runs from Supabase, subscribes to realtime updates for runs and steps,
 * displays run and step statuses, errors, and artifacts, and exposes a Retry action for runs
 * that have an associated workflow slug.
 *
 * @returns A React element that renders the workflow history UI
 */
export function WorkflowHistoryPanel() {
  const [state, setState] = useState<HistoryState>({ loading: true, runs: [] });

  const fetchRuns = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    const { data, error } = await supabase
      .from("workflow_runs")
      .select("*, workflow_steps(*)")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }));
      return;
    }

    setState({ loading: false, runs: data ?? [] });
  }, []);

  useEffect(() => {
    fetchRuns();
    const runChannel = supabase
      .channel("workflow-runs-history")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workflow_runs" },
        () => fetchRuns()
      )
      .subscribe();

    const stepChannel = supabase
      .channel("workflow-steps-history")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workflow_steps" },
        () => fetchRuns()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(runChannel);
      supabase.removeChannel(stepChannel);
    };
  }, [fetchRuns]);

  const handleRetry = useCallback(
    async (run: WorkflowRunRow) => {
      if (!run.workflow_slug) {
        setState((prev) => ({ ...prev, error: "Workflow retry unavailable for ad-hoc runs." }));
        return;
      }

      setState((prev) => ({ ...prev, retryingRunId: run.id, error: undefined }));
      const { error } = await supabase.functions.invoke("workflows/supabase", {
        body: {
          workflow: run.workflow_slug,
          trigger: {
            type: run.trigger_type,
            payload: run.trigger_payload ?? undefined,
          },
          inputs: run.trigger_payload ?? undefined,
        },
      });

      if (error) {
        setState((prev) => ({ ...prev, retryingRunId: undefined, error: error.message }));
        return;
      }

      setState((prev) => ({ ...prev, retryingRunId: undefined }));
      await fetchRuns();
    },
    [fetchRuns]
  );

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Workflow History</h2>
          <p className="text-sm text-muted-foreground">Recent executions, outcomes, and artifacts.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRuns} disabled={state.loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${state.loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {state.error && <p className="mt-4 text-sm text-destructive">{state.error}</p>}

      <ScrollArea className="mt-6 h-[420px] pr-4">
        {state.loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading history...
          </div>
        ) : state.runs.length === 0 ? (
          <p className="text-muted-foreground">No workflow runs recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {state.runs.map((run) => (
              <div key={run.id} className="rounded-lg border border-border bg-background/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{run.workflow_name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Started {new Date(run.started_at ?? run.created_at).toLocaleString()} via {run.trigger_type}
                    </p>
                  </div>
                  <Badge variant={statusVariant[run.status] ?? "outline"} className="font-mono text-xs">
                    {run.status}
                  </Badge>
                </div>

                {run.error && (
                  <p className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                    Error: {run.error}
                  </p>
                )}

                {renderArtifacts(run.artifacts)}

                <div className="mt-3 space-y-2">
                  {run.workflow_steps?.map((step) => (
                    <div key={step.id} className="rounded-md border border-border/50 bg-muted/20 p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">Step {step.step_id}</p>
                          {step.error && <p className="text-xs text-destructive">{step.error}</p>}
                        </div>
                        <Badge variant={statusVariant[step.status] ?? "outline"} className="font-mono text-[10px]">
                          {step.status}
                        </Badge>
                      </div>
                      {renderArtifacts(step.artifacts, true)}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  {run.workflow_slug ? (
                    <Button
                      size="sm"
                      onClick={() => handleRetry(run)}
                      disabled={state.retryingRunId === run.id}
                    >
                      {state.retryingRunId === run.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Retry
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">Retry unavailable for inline workflows.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}

const renderArtifacts = (artifacts: unknown, compact = false) => {
  if (!artifacts) return null;
  const items = Array.isArray(artifacts) ? artifacts : [];
  if (items.length === 0) return null;

  return (
    <div className={`mt-3 space-y-1 ${compact ? "text-xs" : "text-sm"}`}>
      <p className="font-medium text-muted-foreground">Artifacts</p>
      <ul className="space-y-1">
        {items.map((artifact, index) => {
          if (!artifact || typeof artifact !== "object") return null;
          const record = artifact as Record<string, unknown>;
          const url = typeof record.url === "string" ? record.url : undefined;
          const name = typeof record.name === "string" ? record.name : `Artifact ${index + 1}`;
          return (
            <li key={`${name}-${index}`}>
              {url ? (
                <a className="text-primary hover:underline" href={url} target="_blank" rel="noreferrer">
                  {name}
                </a>
              ) : (
                <span>{name}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};