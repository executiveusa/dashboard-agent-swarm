-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  task_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  cost DECIMAL(10,4) DEFAULT 0,
  metadata JSONB
);

-- Logs table
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical'))
);

-- File index table
CREATE TABLE file_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL UNIQUE,
  hash TEXT,
  size BIGINT,
  mime_type TEXT,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Rollbacks table
CREATE TABLE rollbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  original_content TEXT,
  new_content TEXT,
  applied BOOLEAN DEFAULT false
);

-- ML patterns table
CREATE TABLE ml_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  pattern_type TEXT NOT NULL,
  pattern_data JSONB NOT NULL,
  frequency INTEGER DEFAULT 1
);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE rollbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_patterns ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now - no auth required)
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all operations on logs" ON logs FOR ALL USING (true);
CREATE POLICY "Allow all operations on file_index" ON file_index FOR ALL USING (true);
CREATE POLICY "Allow all operations on rollbacks" ON rollbacks FOR ALL USING (true);
CREATE POLICY "Allow all operations on ml_patterns" ON ml_patterns FOR ALL USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE logs;
ALTER PUBLICATION supabase_realtime ADD TABLE file_index;