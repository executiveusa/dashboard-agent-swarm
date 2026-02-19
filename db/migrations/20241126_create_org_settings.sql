-- Create org_settings table for white-label multi-tenancy
-- Migration: 20241126_create_org_settings.sql

CREATE TABLE IF NOT EXISTS org_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  brand_name TEXT,
  logo_url TEXT,
  primary_color TEXT,
  accent_color TEXT,
  domain TEXT,
  llm_profile JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id)
);

-- Create index for faster org lookups
CREATE INDEX IF NOT EXISTS idx_org_settings_org_id ON org_settings(org_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_org_settings_updated_at BEFORE UPDATE ON org_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Example llm_profile structure (JSONB):
-- {
--   "preferredProvider": "google",
--   "preferredModelFor": {
--     "reasoning": "gpt-4o",
--     "code": "claude-3-5-sonnet-20241022",
--     "whatsapp": "gemini-2.0-flash-exp",
--     "content_generation": "gpt-4o-mini"
--   },
--   "costTier": "balanced",
--   "maxTokensPerDay": 1000000
-- }
