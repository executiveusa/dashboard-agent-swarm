-- Create tables for Cynthia agent observability
-- Migration: 20260129_create_cynthia_telemetry_tables.sql
-- Purpose: READ-ONLY observability layer for external agent "Cynthia"

-- Agent Sessions Table
-- Stores session metadata for Cynthia agent runs
CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  agent TEXT NOT NULL DEFAULT 'cynthia',
  mode TEXT,
  goal TEXT,
  model TEXT,
  status TEXT CHECK (status IN ('active', 'completed', 'failed', 'paused')) DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agent Events Table
-- Stores individual telemetry events emitted by Cynthia
CREATE TABLE IF NOT EXISTS agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  agent TEXT NOT NULL DEFAULT 'cynthia',
  event_type TEXT NOT NULL,
  summary TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_sessions_session_id ON agent_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent ON agent_sessions(agent);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_started_at ON agent_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_created_at ON agent_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_events_session_id ON agent_events(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_agent ON agent_events(agent);
CREATE INDEX IF NOT EXISTS idx_agent_events_event_type ON agent_events(event_type);
CREATE INDEX IF NOT EXISTS idx_agent_events_timestamp ON agent_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_events_created_at ON agent_events(created_at DESC);

-- Composite index for common query pattern (events by session, ordered by time)
CREATE INDEX IF NOT EXISTS idx_agent_events_session_timestamp ON agent_events(session_id, timestamp DESC);

-- Foreign key relationship
ALTER TABLE agent_events
  ADD CONSTRAINT fk_agent_events_session
  FOREIGN KEY (session_id)
  REFERENCES agent_sessions(session_id)
  ON DELETE CASCADE;

-- Function to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_agent_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on agent_sessions
CREATE TRIGGER trigger_agent_sessions_updated_at
  BEFORE UPDATE ON agent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_sessions_updated_at();

-- PostgreSQL NOTIFY trigger for real-time streaming
CREATE OR REPLACE FUNCTION notify_agent_event()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('agent_events_changes', json_build_object(
    'id', NEW.id,
    'session_id', NEW.session_id,
    'agent', NEW.agent,
    'event_type', NEW.event_type,
    'timestamp', NEW.timestamp
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for real-time event notifications
CREATE TRIGGER trigger_notify_agent_event
  AFTER INSERT ON agent_events
  FOR EACH ROW
  EXECUTE FUNCTION notify_agent_event();

-- Comments for documentation
COMMENT ON TABLE agent_sessions IS 'Stores session metadata for external agent Cynthia (READ-ONLY observability)';
COMMENT ON TABLE agent_events IS 'Stores telemetry events emitted by Cynthia agent (READ-ONLY observability)';
COMMENT ON COLUMN agent_sessions.session_id IS 'External session identifier from Cynthia agent';
COMMENT ON COLUMN agent_sessions.mode IS 'Current operational mode of the agent';
COMMENT ON COLUMN agent_sessions.goal IS 'Current goal or objective of the agent session';
COMMENT ON COLUMN agent_sessions.model IS 'AI model being used by the agent';
COMMENT ON COLUMN agent_sessions.metadata IS 'Additional session metadata (redacted)';
COMMENT ON COLUMN agent_events.event_type IS 'Type of event (tool_call, reasoning, state_change, error, etc)';
COMMENT ON COLUMN agent_events.summary IS 'Safe reasoning summary (no raw chain-of-thought)';
COMMENT ON COLUMN agent_events.data IS 'Event payload (redacted for sensitive data)';
