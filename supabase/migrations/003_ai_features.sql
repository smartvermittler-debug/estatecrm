-- Migration 003: Support for new AI features

-- Add fields to profiles for weekly report setting
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS weekly_report_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS weekly_report_day VARCHAR(10) DEFAULT 'monday';

-- Add fields to clients for matching
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS budget_min INTEGER,
  ADD COLUMN IF NOT EXISTS budget_max INTEGER,
  ADD COLUMN IF NOT EXISTS search_region TEXT,
  ADD COLUMN IF NOT EXISTS desired_property_type TEXT,
  ADD COLUMN IF NOT EXISTS min_area INTEGER,
  ADD COLUMN IF NOT EXISTS min_rooms INTEGER,
  ADD COLUMN IF NOT EXISTS desired_features TEXT,
  ADD COLUMN IF NOT EXISTS last_match_at TIMESTAMPTZ;

-- Add fields to listings for expose generation
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS energy_class VARCHAR(10),
  ADD COLUMN IF NOT EXISTS monthly_costs INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(4,2) DEFAULT 3.0,
  ADD COLUMN IF NOT EXISTS floor INTEGER,
  ADD COLUMN IF NOT EXISTS year_built INTEGER,
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);

-- Client memory table for AI matching results
CREATE TABLE IF NOT EXISTS client_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ai_matches JSONB DEFAULT '[]'::jsonb,
  last_match_at TIMESTAMPTZ,
  best_match_score INTEGER,
  notes TEXT,
  personality_profile TEXT,
  communication_style TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agent style table for email tone learning
CREATE TABLE IF NOT EXISTS agent_style (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tone TEXT DEFAULT 'professional',
  formality TEXT DEFAULT 'formal',
  signature TEXT,
  email_examples JSONB DEFAULT '[]'::jsonb,
  learned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agent profile (extended professional profile)
CREATE TABLE IF NOT EXISTS agent_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  specializations TEXT[],
  primary_cities TEXT[],
  years_experience INTEGER,
  languages TEXT[],
  bio TEXT,
  certifications TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_memory_user_id ON client_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_client_memory_client_id ON client_memory(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_heat_score ON clients(heat_score, user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status_city ON listings(status, city, user_id);

-- RLS Policies
ALTER TABLE client_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_style ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own client_memory" ON client_memory
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own agent_style" ON agent_style
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own agent_profile" ON agent_profile
  FOR ALL USING (auth.uid() = user_id);

-- Grant service role access for edge functions
GRANT ALL ON client_memory TO service_role;
GRANT ALL ON agent_style TO service_role;
GRANT ALL ON agent_profile TO service_role;

-- Cron job for weekly reports (requires pg_cron extension)
-- SELECT cron.schedule('weekly-broker-report', '0 7 * * 1', $$
--   SELECT net.http_post(
--     url := current_setting('app.supabase_url') || '/functions/v1/weekly-report',
--     headers := '{"Content-Type": "application/json", "x-cron-secret": "' || current_setting('app.cron_secret') || '"}'::jsonb,
--     body := '{}'::jsonb
--   );
-- $$);

COMMENT ON TABLE client_memory IS 'Stores AI-generated client insights, preferences, and listing matches';
COMMENT ON TABLE agent_style IS 'Stores agent communication style for AI email personalization';
COMMENT ON TABLE agent_profile IS 'Extended professional profile for AI context';
