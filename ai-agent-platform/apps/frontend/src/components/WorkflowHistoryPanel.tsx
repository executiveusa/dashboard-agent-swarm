'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { supabaseBrowser } from '../lib/supabaseClient';

type WorkflowRun = {
  id: string;
  workflow_name: string;
  workflow_slug: string | null;
  created_at: string;
  status: string;
  trigger_type: string;
  trigger_payload: Record<string, unknown> | null;
  error: string | null;
  artifacts: unknown;
  workflow_steps: WorkflowStep[];
};

type WorkflowStep = {
  id: string;
  step_id: string;
  status: string;
  error: string | null;
  artifacts: unknown;
};

/**
 * Render a panel showing recent workflow runs, their statuses, artifacts, and steps, with refresh and retry controls.
 *
 * The panel loads the latest runs, keeps them updated via realtime subscriptions, displays errors, and exposes a retry action for runs that have an associated workflow slug.
 *
 * @returns A React element containing the workflow history panel.
 */
export function WorkflowHistoryPanel() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [retrying, setRetrying] = useState<string | undefined>();

  const loadRuns = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    const { data, error } = await supabaseBrowser
      .from('workflow_runs')
      .select('*, workflow_steps(*)')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const safeRuns = ((data as WorkflowRun[]) ?? []).map((run) => ({
      ...run,
      workflow_steps: run.workflow_steps ?? [],
    }));
    setRuns(safeRuns);
    setLoading(false);
  }, []);

// At the top of the file
import debounce from 'lodash.debounce';

export function WorkflowHistoryPanel() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [retrying, setRetrying] = useState<string | undefined>();

  const loadRuns = useCallback(async () => {
    // ... existing implementation
  }, []);

  // Debounce to prevent multiple rapid calls
  const debouncedLoadRuns = useCallback(
    debounce(() => {
      loadRuns();
    }, 300),
    [loadRuns]
  );

  useEffect(() => {
    loadRuns();
    const channel = supabaseBrowser
      .channel('workflow-history-panel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workflow_runs' },
        debouncedLoadRuns
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workflow_steps' },
        debouncedLoadRuns
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [loadRuns, debouncedLoadRuns]);

  // ... rest of component
}

  const retryRun = useCallback(
    async (run: WorkflowRun) => {
      if (!run.workflow_slug) {
        setError('Retry unavailable for inline workflows.');
        return;
      }
      setRetrying(run.id);
      const { error } = await supabaseBrowser.functions.invoke('workflows/supabase', {
        body: {
          workflow: run.workflow_slug,
          trigger: { type: run.trigger_type, payload: run.trigger_payload ?? undefined },
          inputs: run.trigger_payload ?? undefined,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setError(undefined);
      }
      setRetrying(undefined);
      await loadRuns();
    },
    [loadRuns]
  );

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-slate-200">Workflow history</h2>
          <p className="text-xs text-slate-400">Latest executions with status and artifacts.</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500"
          onClick={loadRuns}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-slate-400' : ''}`} /> Refresh
        </button>
      </div>

      {error && <p className="mb-3 text-xs text-rose-400">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
        </div>
      ) : runs.length === 0 ? (
        <p className="text-xs text-slate-500">No workflow runs recorded yet.</p>
      ) : (
        <ul className="space-y-3 text-xs text-slate-300">
          {runs.map((run) => (
            <li key={run.id} className="rounded-md border border-slate-800 bg-slate-950 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-100">{run.workflow_name}</p>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">
                    {run.status} · {new Date(run.created_at).toLocaleString()} · {run.trigger_type}
                  </p>
                </div>
                {run.workflow_slug ? (
                  <button
                    className="rounded-md bg-sky-500 px-2 py-1 text-[11px] font-medium text-white hover:bg-sky-400 disabled:opacity-60"
                    onClick={() => retryRun(run)}
                    disabled={retrying === run.id}
                  >
                    {retrying === run.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Retry'}
                  </button>
                ) : (
                  <span className="rounded-md border border-slate-700 px-2 py-1 text-[10px] text-slate-500">
                    Inline
                  </span>
                )}
              </div>
              {run.error && <p className="mt-2 text-[11px] text-rose-400">{run.error}</p>}
              {renderArtifacts(run.artifacts)}
              {run.workflow_steps?.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-slate-400">Steps</summary>
                  <ul className="mt-1 space-y-1">
                    {run.workflow_steps.map((step) => (
                      <li key={step.id} className="rounded bg-slate-900 p-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-slate-200">{step.step_id}</span>
                          <span className="uppercase tracking-wide text-slate-500">{step.status}</span>
                        </div>
                        {step.error && <p className="mt-1 text-[10px] text-rose-400">{step.error}</p>}
                        {renderArtifacts(step.artifacts)}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Render a list of artifact links or names from a collection of artifact-like objects.
 *
 * Accepts an array (or any value) where each item may have `url` and `name` string fields; items without `url` render as plain text and missing names default to "Artifact N".
 *
 * @param artifacts - A value expected to be an array of objects with optional `url` and `name`; non-array or falsy values produce no output.
 * @returns A JSX unordered list of artifacts where items with `url` are links and others are plain text, or `null` if there are no artifacts to render.
 */
function renderArtifacts(artifacts: unknown) {
  if (!artifacts) return null;
  const list = Array.isArray(artifacts) ? artifacts : [];
  if (list.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1 text-[11px] text-sky-300">
      {list.map((item, index) => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        const url = typeof record.url === 'string' ? record.url : undefined;
        const name = typeof record.name === 'string' ? record.name : `Artifact ${index + 1}`;
        return (
          <li key={`${name}-${index}`}>
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {name}
              </a>
            ) : (
              <span>{name}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}