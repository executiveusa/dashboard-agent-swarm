-- Workflow run history tables
CREATE TABLE workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  workflow_name TEXT NOT NULL,
  workflow_slug TEXT,
  trigger_type TEXT NOT NULL,
  trigger_payload JSONB,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'succeeded', 'failed')),
  outputs JSONB,
  artifacts JSONB,
  error TEXT
);

CREATE INDEX workflow_runs_workflow_name_idx ON workflow_runs (workflow_name, created_at DESC);
CREATE INDEX workflow_runs_status_idx ON workflow_runs (status);

CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  output JSONB,
  error TEXT,
  artifacts JSONB
);

CREATE INDEX workflow_steps_run_id_idx ON workflow_steps (run_id);
CREATE INDEX workflow_steps_status_idx ON workflow_steps (status);

ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can SELECT workflow_runs" ON workflow_runs
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can SELECT workflow_steps" ON workflow_steps
  FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER PUBLICATION supabase_realtime ADD TABLE workflow_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_steps;
