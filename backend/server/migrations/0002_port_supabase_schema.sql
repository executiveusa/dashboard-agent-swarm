-- Port of supabase/migrations/20251006233246_613b47aa-1f2f-4493-9292-0c58a8b131a2.sql
-- The self-hosted data service authenticates callers via the API gateway,
-- so row level security is intentionally disabled. Policies from the Supabase
-- project are dropped to avoid unexpected permission behaviour.

ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE file_index DISABLE ROW LEVEL SECURITY;
ALTER TABLE rollbacks DISABLE ROW LEVEL SECURITY;
ALTER TABLE ml_patterns DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow all operations on logs" ON logs;
DROP POLICY IF EXISTS "Allow all operations on file_index" ON file_index;
DROP POLICY IF EXISTS "Allow all operations on rollbacks" ON rollbacks;
DROP POLICY IF EXISTS "Allow all operations on ml_patterns" ON ml_patterns;

-- Align timestamp columns with Supabase defaults.
ALTER TABLE tasks ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE logs ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE file_index ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE file_index ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE rollbacks ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE ml_patterns ALTER COLUMN created_at SET DEFAULT NOW();

-- Ensure the file_index.updated_at column stays fresh on updates.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS file_index_updated_at ON file_index;
CREATE TRIGGER file_index_updated_at
BEFORE UPDATE ON file_index
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
