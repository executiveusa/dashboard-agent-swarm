-- Structured audit trail for agents/tools/workflows
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  session_id TEXT,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS structured_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id TEXT,
  request_id TEXT,
  category TEXT NOT NULL CHECK (category IN ('agent','tool','workflow')),
  name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('start','finish','error')),
  duration_ms INTEGER,
  cost_usd NUMERIC(12,6),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS metrics_timeseries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metric TEXT NOT NULL,
  dimensions JSONB DEFAULT '{}'::jsonb,
  value NUMERIC(18,6) NOT NULL
);

CREATE OR REPLACE VIEW grafana_metrics AS
SELECT
  metric,
  jsonb_extract_path_text(dimensions, 'category') AS category,
  jsonb_extract_path_text(dimensions, 'name') AS name,
  jsonb_extract_path_text(dimensions, 'action') AS action,
  SUM(value) AS total_value,
  MIN(created_at) AS window_start,
  MAX(created_at) AS window_end
FROM metrics_timeseries
GROUP BY metric, category, name, action;

CREATE OR REPLACE VIEW structured_event_rollups AS
SELECT
  date_trunc('hour', created_at) AS bucket,
  category,
  name,
  COUNT(*) FILTER (WHERE action = 'error') AS errors,
  COUNT(*) FILTER (WHERE action = 'finish') AS successes,
  AVG(duration_ms) AS avg_latency_ms,
  SUM(cost_usd) AS total_cost
FROM structured_audit_events
GROUP BY bucket, category, name;

CREATE OR REPLACE FUNCTION record_metric(
  metric_name TEXT,
  metric_value NUMERIC,
  metric_dimensions JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
  INSERT INTO metrics_timeseries(metric, value, dimensions)
  VALUES (metric_name, metric_value, COALESCE(metric_dimensions, '{}'::jsonb));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  PERFORM 1 FROM pg_roles WHERE rolname = 'anon';
  IF FOUND THEN
    ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE structured_audit_events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE metrics_timeseries ENABLE ROW LEVEL SECURITY;

    CREATE POLICY IF NOT EXISTS "Allow inserts for service role on audit_logs"
      ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY IF NOT EXISTS "Allow inserts for service role on structured_audit_events"
      ON structured_audit_events FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY IF NOT EXISTS "Allow selects for grafana metrics"
      ON structured_audit_events FOR SELECT USING (true);
    CREATE POLICY IF NOT EXISTS "Allow inserts for service role on metrics_timeseries"
      ON metrics_timeseries FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY IF NOT EXISTS "Allow selects for grafana metrics_timeseries"
      ON metrics_timeseries FOR SELECT USING (true);
  END IF;
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE structured_audit_events;
ALTER PUBLICATION supabase_realtime ADD TABLE metrics_timeseries;
