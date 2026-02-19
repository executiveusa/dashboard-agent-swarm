-- Create affiliate system tables
-- Migration: 20241126_create_affiliate_tables.sql

-- Affiliate Programs
CREATE TABLE IF NOT EXISTS affiliate_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_url TEXT,
  terms_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_programs_org_id ON affiliate_programs(org_id);

-- Affiliate Partners
CREATE TABLE IF NOT EXISTS affiliate_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES affiliate_programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  payout_model TEXT CHECK (payout_model IN ('cpa', 'revenue_share', 'hybrid')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_partners_program_id ON affiliate_partners(program_id);

-- Affiliate Links
CREATE TABLE IF NOT EXISTS affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES affiliate_programs(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES affiliate_partners(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  target_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(program_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_links_program_id ON affiliate_links(program_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_partner_id ON affiliate_links(partner_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_slug ON affiliate_links(slug);

-- Affiliate Events (clicks, signups, purchases)
CREATE TABLE IF NOT EXISTS affiliate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('click', 'signup', 'purchase')),
  value NUMERIC(12,2),
  currency TEXT DEFAULT 'USD',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_events_link_id ON affiliate_events(link_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_events_type ON affiliate_events(event_type);
CREATE INDEX IF NOT EXISTS idx_affiliate_events_created_at ON affiliate_events(created_at);

-- Triggers for updated_at
CREATE TRIGGER update_affiliate_programs_updated_at BEFORE UPDATE ON affiliate_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliate_partners_updated_at BEFORE UPDATE ON affiliate_partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
