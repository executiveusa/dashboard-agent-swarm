-- Create agent_runs table for Agent Lightning monitoring
-- Migration: 20241126_create_agent_runs.sql

CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL,
  input_meta JSONB,
  output_meta JSONB,
  reward NUMERIC(4,3),
  env TEXT CHECK (env IN ('dev', 'staging', 'prod')) DEFAULT 'dev',
  duration_ms INTEGER,
  tokens_used INTEGER,
  cost_usd NUMERIC(10,6),
  model_used TEXT,
  provider_used TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_id ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_org_id ON agent_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_project_id ON agent_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_task_type ON agent_runs(task_type);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at ON agent_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_runs_env ON agent_runs(env);

-- Index for Agent Lightning reward computation queries
CREATE INDEX IF NOT EXISTS idx_agent_runs_reward_null ON agent_runs(created_at) WHERE reward IS NULL;

-- Comments for documentation
COMMENT ON TABLE agent_runs IS 'Logs all agent executions for Agent Lightning monitoring and training';
COMMENT ON COLUMN agent_runs.reward IS 'Computed by Agent Lightning based on metrics_daily deltas and feedback';
COMMENT ON COLUMN agent_runs.input_meta IS 'Sanitized input parameters (no PII)';
COMMENT ON COLUMN agent_runs.output_meta IS 'Summary of output (no full content)';
