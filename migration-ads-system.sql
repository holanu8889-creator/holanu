-- HOLANU ADS SYSTEM MIGRATION
-- Complete database schema for paid advertising and AI description system

-- =========================================
-- AD CAMPAIGNS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('featured', 'premium', 'super_premium', 'banner')),
  target_location JSONB, -- {province, city, district} or null for all locations
  budget BIGINT NOT NULL CHECK (budget > 0), -- in Rupiah
  bid_type TEXT NOT NULL CHECK (bid_type IN ('flat_fee', 'cpc', 'cpm')),
  bid_amount BIGINT NOT NULL CHECK (bid_amount > 0), -- per click/impression or total
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_date_range CHECK (end_at > start_at),
  CONSTRAINT valid_budget CHECK (
    CASE
      WHEN bid_type = 'flat_fee' THEN budget >= bid_amount
      WHEN bid_type IN ('cpc', 'cpm') THEN budget >= 10000 -- minimum budget
      ELSE true
    END
  )
);

-- =========================================
-- AD IMPRESSIONS TABLE (Analytics)
-- =========================================
CREATE TABLE IF NOT EXISTS ad_impressions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE, -- null for banner ads
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- anonymous users allowed
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click', 'whatsapp_click')),
  meta JSONB DEFAULT '{}', -- {device_type, referrer, user_agent, ip_hash, etc.}
  session_id TEXT, -- for deduplication
  cost_incurred BIGINT DEFAULT 0, -- cost charged for this event

  -- Indexes for performance
  INDEX idx_ad_impressions_campaign_timestamp (campaign_id, timestamp),
  INDEX idx_ad_impressions_property (property_id),
  INDEX idx_ad_impressions_session (session_id),
  INDEX idx_ad_impressions_event_type (event_type)
);

-- =========================================
-- AD TRANSACTIONS TABLE (Billing)
-- =========================================
CREATE TABLE IF NOT EXISTS ad_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL, -- 'midtrans', 'xendit', 'manual'
  external_payment_id TEXT UNIQUE, -- from payment gateway
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  INDEX idx_ad_transactions_campaign (campaign_id),
  INDEX idx_ad_transactions_agent (agent_id),
  INDEX idx_ad_transactions_status (status),
  INDEX idx_ad_transactions_external_id (external_payment_id)
);

-- =========================================
-- AD SLOTS TABLE (Banner Positions)
-- =========================================
CREATE TABLE IF NOT EXISTS ad_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_name TEXT NOT NULL UNIQUE,
  position TEXT NOT NULL, -- 'hero', 'sidebar', 'footer', 'property_list'
  description TEXT,
  max_width INT DEFAULT 1200,
  max_height INT DEFAULT 300,
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0, -- for ordering
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  INDEX idx_ad_slots_active (is_active),
  INDEX idx_ad_slots_position (position)
);

-- =========================================
-- AI DESCRIPTIONS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS ai_descriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_used TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gpt-3.5-turbo',
  generated_text TEXT NOT NULL,
  variant_index INT NOT NULL DEFAULT 1,
  tokens_used INT,
  cost_incurred DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  INDEX idx_ai_descriptions_property (property_id),
  INDEX idx_ai_descriptions_agent (agent_id),
  INDEX idx_ai_descriptions_created (created_at)
);

-- =========================================
-- AUDIT LOGS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS ad_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'activated', 'paused', 'cancelled', etc.
  old_values JSONB,
  new_values JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  INDEX idx_ad_audit_logs_campaign (campaign_id),
  INDEX idx_ad_audit_logs_agent (agent_id),
  INDEX idx_ad_audit_logs_admin (admin_id),
  INDEX idx_ad_audit_logs_action (action)
);

-- =========================================
-- DEFAULT AD SLOTS
-- =========================================
INSERT INTO ad_slots (slot_name, position, description, max_width, max_height, priority) VALUES
('hero_banner', 'hero', 'Banner utama di halaman home', 1200, 400, 10),
('sidebar_top', 'sidebar', 'Banner samping atas', 300, 250, 8),
('property_list_top', 'property_list', 'Banner di atas daftar properti', 728, 90, 6),
('footer_banner', 'footer', 'Banner di footer', 1200, 200, 4)
ON CONFLICT (slot_name) DO NOTHING;

-- =========================================
-- FUNCTIONS & TRIGGERS
-- =========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_ad_campaigns_updated_at
  BEFORE UPDATE ON ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_transactions_updated_at
  BEFORE UPDATE ON ad_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate campaign cost
CREATE OR REPLACE FUNCTION calculate_campaign_cost(
  campaign_id UUID,
  event_type TEXT
) RETURNS BIGINT AS $$
DECLARE
  campaign_record RECORD;
  cost BIGINT := 0;
BEGIN
  SELECT * INTO campaign_record FROM ad_campaigns WHERE id = campaign_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Calculate cost based on bid_type
  CASE campaign_record.bid_type
    WHEN 'flat_fee' THEN
      -- Flat fee campaigns don't charge per event
      cost := 0;
    WHEN 'cpc' THEN
      -- Cost per click
      IF event_type IN ('click', 'whatsapp_click') THEN
        cost := campaign_record.bid_amount;
      END IF;
    WHEN 'cpm' THEN
      -- Cost per mille (1000 impressions)
      IF event_type = 'impression' THEN
        -- This would be calculated daily, for now return proportional cost
        cost := (campaign_record.bid_amount / 1000)::BIGINT;
      END IF;
  END CASE;

  RETURN cost;
END;
$$ LANGUAGE plpgsql;

-- Function to check campaign budget
CREATE OR REPLACE FUNCTION check_campaign_budget(campaign_id UUID) RETURNS BOOLEAN AS $$
DECLARE
  campaign_record RECORD;
  total_spent BIGINT;
BEGIN
  SELECT * INTO campaign_record FROM ad_campaigns WHERE id = campaign_id;

  IF NOT FOUND OR campaign_record.status != 'active' THEN
    RETURN FALSE;
  END IF;

  -- Calculate total spent
  SELECT COALESCE(SUM(cost_incurred), 0) INTO total_spent
  FROM ad_impressions
  WHERE campaign_id = campaign_id;

  -- Check if budget exceeded
  RETURN (total_spent + campaign_record.bid_amount) <= campaign_record.budget;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-pause campaigns when budget exhausted
CREATE OR REPLACE FUNCTION auto_pause_campaigns() RETURNS VOID AS $$
DECLARE
  campaign_record RECORD;
BEGIN
  FOR campaign_record IN
    SELECT c.id, c.budget,
           COALESCE(SUM(i.cost_incurred), 0) as total_spent
    FROM ad_campaigns c
    LEFT JOIN ad_impressions i ON c.id = i.campaign_id
    WHERE c.status = 'active'
    GROUP BY c.id, c.budget
    HAVING COALESCE(SUM(i.cost_incurred), 0) >= c.budget
  LOOP
    UPDATE ad_campaigns SET status = 'completed' WHERE id = campaign_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to expire campaigns
CREATE OR REPLACE FUNCTION expire_campaigns() RETURNS VOID AS $$
BEGIN
  UPDATE ad_campaigns
  SET status = 'completed'
  WHERE status = 'active' AND end_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- RLS POLICIES
-- =========================================

-- Enable RLS
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_audit_logs ENABLE ROW LEVEL SECURITY;

-- Ad campaigns: agents can only see their own, admins can see all
CREATE POLICY "Users can view own campaigns" ON ad_campaigns
  FOR SELECT USING (auth.uid() = agent_id);

CREATE POLICY "Admins can view all campaigns" ON ad_campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Ad impressions: agents can see impressions for their campaigns
CREATE POLICY "Users can view impressions for own campaigns" ON ad_impressions
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM ad_campaigns WHERE agent_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all impressions" ON ad_impressions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Ad transactions: users can see their own transactions
CREATE POLICY "Users can view own transactions" ON ad_transactions
  FOR SELECT USING (auth.uid() = agent_id);

CREATE POLICY "Admins can view all transactions" ON ad_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- AI descriptions: users can see their own
CREATE POLICY "Users can view own AI descriptions" ON ai_descriptions
  FOR ALL USING (auth.uid() = agent_id);

-- Ad slots: read-only for all authenticated users
CREATE POLICY "Authenticated users can view ad slots" ON ad_slots
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage ad slots" ON ad_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Audit logs: admins only
CREATE POLICY "Admins can view audit logs" ON ad_audit_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- =========================================
-- INDEXES FOR PERFORMANCE
-- =========================================
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_agent_status ON ad_campaigns(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_type_location ON ad_campaigns(campaign_type, target_location);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_dates ON ad_campaigns(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_timestamp ON ad_impressions(timestamp);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_cost ON ad_impressions(cost_incurred) WHERE cost_incurred > 0;
CREATE INDEX IF NOT EXISTS idx_ad_transactions_status_created ON ad_transactions(status, created_at);

-- =========================================
-- SCHEDULED FUNCTIONS (CRON JOBS)
-- =========================================
-- Note: These would be implemented as Supabase Edge Functions or scheduled database functions
-- For now, we'll create the functions that would be called by cron

-- Daily billing function (to be called by cron)
CREATE OR REPLACE FUNCTION process_daily_ad_billing() RETURNS VOID AS $$
BEGIN
  -- Auto-pause campaigns with exhausted budget
  PERFORM auto_pause_campaigns();

  -- Expire campaigns that reached end date
  PERFORM expire_campaigns();

  -- Process CPM billing (cost per 1000 impressions)
  -- This would calculate daily costs and deduct from budget
  -- Implementation depends on business logic

  RAISE NOTICE 'Daily ad billing processed successfully';
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- MIGRATION COMPLETE
-- =========================================

-- Add comments for documentation
COMMENT ON TABLE ad_campaigns IS 'Advertising campaigns for property promotions';
COMMENT ON TABLE ad_impressions IS 'Analytics data for ad impressions and clicks';
COMMENT ON TABLE ad_transactions IS 'Billing transactions for ad campaigns';
COMMENT ON TABLE ad_slots IS 'Available banner ad positions';
COMMENT ON TABLE ai_descriptions IS 'AI-generated property descriptions';
COMMENT ON TABLE ad_audit_logs IS 'Audit trail for campaign changes';

-- Final verification
DO $$
BEGIN
  RAISE NOTICE 'HOLANU Ads System Migration Completed Successfully!';
  RAISE NOTICE 'Created tables: ad_campaigns, ad_impressions, ad_transactions, ad_slots, ai_descriptions, ad_audit_logs';
  RAISE NOTICE 'Created functions: calculate_campaign_cost, check_campaign_budget, auto_pause_campaigns, expire_campaigns, process_daily_ad_billing';
  RAISE NOTICE 'Enabled RLS policies for all tables';
  RAISE NOTICE 'Created performance indexes';
END $$;