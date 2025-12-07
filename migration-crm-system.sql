-- HOLANU CRM SYSTEM MIGRATION
-- Complete database schema for lead management and WhatsApp integration

-- =========================================
-- LEADS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  user_email TEXT,
  source TEXT NOT NULL CHECK (source IN ('whatsapp', 'contact_form', 'call', 'website')),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'not_interested', 'converted', 'lost')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  score INTEGER DEFAULT 0, -- Lead scoring algorithm result
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_phone CHECK (user_phone ~ '^\+?[0-9\s\-\(\)]+$'),
  CONSTRAINT valid_email CHECK (user_email IS NULL OR user_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);

-- =========================================
-- LEAD MESSAGES TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS lead_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_role TEXT NOT NULL CHECK (from_role IN ('visitor', 'agent', 'system')),
  from_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- agent id or null for visitor/system
  content TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'web', 'email', 'call')),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'template')),
  external_message_id TEXT, -- WhatsApp message ID or email message ID
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}', -- Additional data like file URLs, template variables
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  INDEX idx_lead_messages_lead_timestamp (lead_id, created_at),
  INDEX idx_lead_messages_external_id (external_message_id),
  INDEX idx_lead_messages_status (status)
);

-- =========================================
-- LEAD ASSIGNMENTS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS lead_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assignment_type TEXT DEFAULT 'manual' CHECK (assignment_type IN ('auto', 'manual', 'escalation')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  INDEX idx_lead_assignments_lead (lead_id),
  INDEX idx_lead_assignments_agent (assigned_to),
  INDEX idx_lead_assignments_assigner (assigned_by)
);

-- =========================================
-- LEAD NOTES TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS lead_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'follow_up', 'complaint', 'escalation')),
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  INDEX idx_lead_notes_lead (lead_id),
  INDEX idx_lead_notes_author (author_id)
);

-- =========================================
-- WHATSAPP TEMPLATES TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  template_text TEXT NOT NULL,
  variables_json JSONB DEFAULT '[]', -- Array of variable names
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'greeting', 'follow_up', 'closing', 'complaint')),
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  INDEX idx_whatsapp_templates_category (category),
  INDEX idx_whatsapp_templates_active (is_active)
);

-- =========================================
-- WHATSAPP CONVERSATIONS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  whatsapp_id TEXT UNIQUE, -- WhatsApp Business API conversation ID
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'expired')),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  INDEX idx_whatsapp_conversations_phone (phone_number),
  INDEX idx_whatsapp_conversations_lead (lead_id),
  INDEX idx_whatsapp_conversations_status (status)
);

-- =========================================
-- CRM ANALYTICS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS crm_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  metric_type TEXT NOT NULL, -- 'leads_created', 'messages_sent', 'response_time', etc.
  metric_value INTEGER NOT NULL,
  agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  INDEX idx_crm_analytics_date_type (date, metric_type),
  INDEX idx_crm_analytics_agent (agent_id),
  INDEX idx_crm_analytics_property (property_id)
);

-- =========================================
-- AGENT PERFORMANCE TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS agent_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  leads_assigned INTEGER DEFAULT 0,
  leads_converted INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  avg_response_time_minutes INTEGER DEFAULT 0,
  customer_satisfaction_score DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(agent_id, period_start, period_end),

  -- Indexes
  INDEX idx_agent_performance_agent_period (agent_id, period_start, period_end)
);

-- =========================================
-- FUNCTIONS & TRIGGERS
-- =========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_crm_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at_column();

-- Function to calculate lead score
CREATE OR REPLACE FUNCTION calculate_lead_score(lead_id UUID) RETURNS INTEGER AS $$
DECLARE
  lead_record RECORD;
  score INTEGER := 0;
  hours_since_creation INTEGER;
  message_count INTEGER;
  property_price BIGINT;
BEGIN
  -- Get lead data
  SELECT l.*, p.price as property_price
  INTO lead_record
  FROM leads l
  LEFT JOIN properties p ON l.property_id = p.id
  WHERE l.id = lead_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Base score
  score := 10;

  -- Recency bonus (newer leads get higher score)
  hours_since_creation := EXTRACT(EPOCH FROM (NOW() - lead_record.created_at)) / 3600;
  IF hours_since_creation < 1 THEN score := score + 50;
  ELSIF hours_since_creation < 24 THEN score := score + 30;
  ELSIF hours_since_creation < 168 THEN score := score + 20; -- 1 week
  END IF;

  -- Message engagement bonus
  SELECT COUNT(*) INTO message_count
  FROM lead_messages
  WHERE lead_id = lead_id AND from_role = 'visitor';

  score := score + (message_count * 5);

  -- Property price factor (higher price = higher priority)
  property_price := COALESCE(lead_record.property_price, 0);
  IF property_price > 5000000000 THEN score := score + 40;      -- > 5M
  ELSIF property_price > 1000000000 THEN score := score + 30;   -- > 1M
  ELSIF property_price > 500000000 THEN score := score + 20;    -- > 500K
  ELSIF property_price > 100000000 THEN score := score + 10;    -- > 100K
  END IF;

  -- Source priority
  CASE lead_record.source
    WHEN 'call' THEN score := score + 30;
    WHEN 'contact_form' THEN score := score + 20;
    WHEN 'whatsapp' THEN score := score + 15;
    ELSE score := score + 5;
  END CASE;

  RETURN GREATEST(0, LEAST(100, score));
END;
$$ LANGUAGE plpgsql;

-- Function to auto-assign leads
CREATE OR REPLACE FUNCTION auto_assign_lead(new_lead_id UUID) RETURNS VOID AS $$
DECLARE
  lead_record RECORD;
  assigned_agent_id UUID;
  active_agents UUID[];
BEGIN
  -- Get lead data
  SELECT * INTO lead_record FROM leads WHERE id = new_lead_id;

  -- If property has an agent, assign to them first
  IF lead_record.property_id IS NOT NULL THEN
    SELECT agent_id INTO assigned_agent_id
    FROM properties
    WHERE id = lead_record.property_id;

    IF assigned_agent_id IS NOT NULL THEN
      INSERT INTO lead_assignments (lead_id, assigned_to, assignment_type)
      VALUES (new_lead_id, assigned_agent_id, 'auto');

      UPDATE leads SET agent_id = assigned_agent_id WHERE id = new_lead_id;
      RETURN;
    END IF;
  END IF;

  -- Round-robin assignment to active agents
  SELECT array_agg(id)
  INTO active_agents
  FROM auth.users
  WHERE id IN (
    SELECT id FROM profiles WHERE role IN ('agent', 'admin') AND status = 'active'
  );

  IF array_length(active_agents, 1) > 0 THEN
    -- Simple round-robin based on lead count
    SELECT assigned_to INTO assigned_agent_id
    FROM lead_assignments
    WHERE assigned_to = ANY(active_agents)
    GROUP BY assigned_to
    ORDER BY COUNT(*) ASC
    LIMIT 1;

    -- If no assignments yet, pick first agent
    IF assigned_agent_id IS NULL THEN
      assigned_agent_id := active_agents[1];
    END IF;

    INSERT INTO lead_assignments (lead_id, assigned_to, assignment_type)
    VALUES (new_lead_id, assigned_agent_id, 'auto');

    UPDATE leads SET agent_id = assigned_agent_id WHERE id = new_lead_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update lead last_contacted_at
CREATE OR REPLACE FUNCTION update_lead_last_contacted() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.from_role = 'agent' THEN
    UPDATE leads SET last_contacted_at = NEW.created_at WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating last contacted
CREATE TRIGGER update_lead_contact_trigger
  AFTER INSERT ON lead_messages
  FOR EACH ROW EXECUTE FUNCTION update_lead_last_contacted();

-- Function to check for escalation (unresponsive leads)
CREATE OR REPLACE FUNCTION check_lead_escalation() RETURNS VOID AS $$
DECLARE
  unresponsive_lead RECORD;
  admin_user UUID;
BEGIN
  -- Find leads not contacted for more than 24 hours
  FOR unresponsive_lead IN
    SELECT l.id, l.agent_id, l.created_at
    FROM leads l
    WHERE l.status = 'new'
    AND l.last_contacted_at IS NULL
    AND (NOW() - l.created_at) > INTERVAL '24 hours'
  LOOP
    -- Find admin user
    SELECT id INTO admin_user
    FROM profiles
    WHERE role = 'admin'
    ORDER BY created_at ASC
    LIMIT 1;

    IF admin_user IS NOT NULL THEN
      -- Escalate to admin
      INSERT INTO lead_assignments (lead_id, assigned_to, assigned_by, assignment_type, notes)
      VALUES (unresponsive_lead.id, admin_user, admin_user, 'escalation', 'Auto-escalated: No response within 24 hours');

      UPDATE leads SET agent_id = admin_user, priority = 'high' WHERE id = unresponsive_lead.id;

      -- Add system note
      INSERT INTO lead_notes (lead_id, author_id, note, note_type)
      VALUES (unresponsive_lead.id, admin_user, 'Lead escalated due to no response within 24 hours', 'escalation');
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- DEFAULT WHATSAPP TEMPLATES
-- =========================================
INSERT INTO whatsapp_templates (name, template_text, variables_json, category) VALUES
('greeting', 'Halo {{name}}! Terima kasih telah tertarik dengan properti {{property_title}}. Saya {{agent_name}} dari HOLANU, agen properti profesional. Ada yang bisa saya bantu?', '["name", "property_title", "agent_name"]', 'greeting'),
('property_info', 'Properti {{property_title}} terletak di {{location}} dengan harga {{price}}. Fasilitas: {{facilities}}. Apakah Anda ingin saya kirim detail lengkap atau foto tambahan?', '["property_title", "location", "price", "facilities"]', 'general'),
('schedule_visit', 'Baik {{name}}, kapan waktu yang tepat untuk Anda melakukan survei ke lokasi? Saya bisa mengatur jadwal kunjungan sesuai ketersediaan Anda.', '["name"]', 'follow_up'),
('price_negotiation', 'Untuk properti {{property_title}}, harga normal adalah {{price}}. Namun kami bisa diskusikan fleksibilitas harga tergantung kondisi pembayaran dan waktu closing.', '["property_title", "price"]', 'general'),
('closing_attempt', 'Berdasarkan diskusi kita, properti {{property_title}} sangat cocok dengan kebutuhan Anda. Apakah Anda sudah siap untuk melanjutkan ke tahap booking serious?', '["property_title"]', 'closing'),
('follow_up_no_response', 'Halo {{name}}, saya {{agent_name}} dari HOLANU. Beberapa hari yang lalu Anda menanyakan tentang properti {{property_title}}. Masih tertarik untuk mendapatkan informasi lebih detail?', '["name", "agent_name", "property_title"]', 'follow_up')
ON CONFLICT (name) DO NOTHING;

-- =========================================
-- RLS POLICIES
-- =========================================

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY;

-- Leads: agents can see their assigned leads, admins can see all
CREATE POLICY "Agents can view their assigned leads" ON leads
  FOR SELECT USING (
    agent_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Agents can update their assigned leads" ON leads
  FOR UPDATE USING (
    agent_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Lead messages: users can see messages for leads they have access to
CREATE POLICY "Users can view messages for accessible leads" ON lead_messages
  FOR SELECT USING (
    lead_id IN (
      SELECT id FROM leads WHERE agent_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    )
  );

CREATE POLICY "Agents can insert messages for their leads" ON lead_messages
  FOR INSERT WITH CHECK (
    lead_id IN (SELECT id FROM leads WHERE agent_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Lead assignments: agents can see assignments for their leads
CREATE POLICY "Users can view lead assignments" ON lead_assignments
  FOR SELECT USING (
    lead_id IN (
      SELECT id FROM leads WHERE agent_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    )
  );

-- Lead notes: users can see notes for leads they have access to
CREATE POLICY "Users can view lead notes" ON lead_notes
  FOR SELECT USING (
    lead_id IN (
      SELECT id FROM leads WHERE agent_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    )
  );

CREATE POLICY "Users can create notes for accessible leads" ON lead_notes
  FOR INSERT WITH CHECK (
    lead_id IN (
      SELECT id FROM leads WHERE agent_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    )
  );

-- WhatsApp templates: read-only for authenticated users, admin can manage
CREATE POLICY "Authenticated users can view templates" ON whatsapp_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage templates" ON whatsapp_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- WhatsApp conversations: agents can see conversations for their leads
CREATE POLICY "Users can view whatsapp conversations" ON whatsapp_conversations
  FOR SELECT USING (
    lead_id IN (
      SELECT id FROM leads WHERE agent_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    )
  );

-- Analytics: agents can see their own analytics, admins can see all
CREATE POLICY "Users can view crm analytics" ON crm_analytics
  FOR SELECT USING (
    agent_id = auth.uid() OR agent_id IS NULL OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Agent performance: users can see their own, admins can see all
CREATE POLICY "Users can view agent performance" ON agent_performance
  FOR SELECT USING (
    agent_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- =========================================
-- INDEXES FOR PERFORMANCE
-- =========================================
CREATE INDEX IF NOT EXISTS idx_leads_agent_status ON leads(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_property ON leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_source_status ON leads(source, status);
CREATE INDEX IF NOT EXISTS idx_leads_created_priority ON leads(created_at, priority);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(user_phone);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);

-- =========================================
-- SCHEDULED FUNCTIONS (CRON JOBS)
-- =========================================
-- Note: These would be implemented as Supabase Edge Functions or scheduled database functions

-- Daily analytics aggregation
CREATE OR REPLACE FUNCTION aggregate_daily_crm_analytics() RETURNS VOID AS $$
BEGIN
  -- Aggregate leads created
  INSERT INTO crm_analytics (date, metric_type, metric_value)
  SELECT
    DATE(created_at),
    'leads_created',
    COUNT(*)
  FROM leads
  WHERE DATE(created_at) = CURRENT_DATE
  GROUP BY DATE(created_at);

  -- Aggregate messages sent
  INSERT INTO crm_analytics (date, metric_type, metric_value, agent_id)
  SELECT
    DATE(created_at),
    'messages_sent',
    COUNT(*),
    from_id
  FROM lead_messages
  WHERE DATE(created_at) = CURRENT_DATE AND from_role = 'agent'
  GROUP BY DATE(created_at), from_id;

  -- Update lead scores
  UPDATE leads SET score = calculate_lead_score(id) WHERE status = 'new';

  -- Check for escalations
  PERFORM check_lead_escalation();

  RAISE NOTICE 'Daily CRM analytics aggregated successfully';
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- MIGRATION COMPLETE
-- =========================================

-- Add comments for documentation
COMMENT ON TABLE leads IS 'Lead records from various sources (WhatsApp, contact forms, calls)';
COMMENT ON TABLE lead_messages IS 'Message threads for lead conversations';
COMMENT ON TABLE lead_assignments IS 'Assignment history and auto-assignment records';
COMMENT ON TABLE lead_notes IS 'Internal notes and follow-ups for leads';
COMMENT ON TABLE whatsapp_templates IS 'Pre-defined message templates for quick replies';
COMMENT ON TABLE whatsapp_conversations IS 'WhatsApp conversation tracking';
COMMENT ON TABLE crm_analytics IS 'Daily metrics and KPIs for CRM performance';
COMMENT ON TABLE agent_performance IS 'Agent performance tracking and analytics';

-- Final verification
DO $$
BEGIN
  RAISE NOTICE 'HOLANU CRM System Migration Completed Successfully!';
  RAISE NOTICE 'Created tables: leads, lead_messages, lead_assignments, lead_notes, whatsapp_templates, whatsapp_conversations, crm_analytics, agent_performance';
  RAISE NOTICE 'Created functions: calculate_lead_score, auto_assign_lead, check_lead_escalation, aggregate_daily_crm_analytics';
  RAISE NOTICE 'Enabled RLS policies for all tables';
  RAISE NOTICE 'Created performance indexes';
  RAISE NOTICE 'Inserted default WhatsApp templates';
END $$;