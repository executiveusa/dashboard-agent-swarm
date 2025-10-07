CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Core task + log tables
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  task_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','running','completed','failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  cost NUMERIC(12,4) DEFAULT 0,
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  risk_level TEXT CHECK (risk_level IN ('low','medium','high','critical'))
);

CREATE TABLE IF NOT EXISTS file_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL UNIQUE,
  hash TEXT,
  size BIGINT,
  mime_type TEXT,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rollbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  original_content TEXT,
  new_content TEXT,
  applied BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS ml_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pattern_type TEXT NOT NULL,
  pattern_data JSONB NOT NULL,
  frequency INTEGER DEFAULT 1
);

-- Notification helpers for SSE feeds
CREATE OR REPLACE FUNCTION notify_task_change() RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    payload := json_build_object('type', 'delete', 'task', row_to_json(OLD));
  ELSIF (TG_OP = 'UPDATE') THEN
    payload := json_build_object('type', 'update', 'task', row_to_json(NEW), 'previous', row_to_json(OLD));
  ELSE
    payload := json_build_object('type', 'insert', 'task', row_to_json(NEW));
  END IF;

  PERFORM pg_notify('tasks_changes', payload::TEXT);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_log_change() RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  payload := json_build_object('type', 'insert', 'log', row_to_json(NEW));
  PERFORM pg_notify('logs_changes', payload::TEXT);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_notify_trigger ON tasks;
CREATE TRIGGER tasks_notify_trigger
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW EXECUTE FUNCTION notify_task_change();

DROP TRIGGER IF EXISTS logs_notify_trigger ON logs;
CREATE TRIGGER logs_notify_trigger
AFTER INSERT ON logs
FOR EACH ROW EXECUTE FUNCTION notify_log_change();
