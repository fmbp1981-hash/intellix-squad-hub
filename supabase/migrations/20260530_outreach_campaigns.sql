-- outreach_campaigns — campanhas de disparo em batch

CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed')),
  lead_ids UUID[] NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outreach_campaigns_status_idx ON outreach_campaigns(status);
CREATE INDEX IF NOT EXISTS outreach_campaigns_created_at_idx ON outreach_campaigns(created_at DESC);

ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outreach_campaigns_select" ON outreach_campaigns
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "outreach_campaigns_insert" ON outreach_campaigns
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "outreach_campaigns_update" ON outreach_campaigns
  FOR UPDATE TO authenticated USING (true);

-- outreach_campaign_logs — log por lead dentro de uma campanha

CREATE TABLE IF NOT EXISTS outreach_campaign_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES outreach_leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outreach_campaign_logs_campaign_idx ON outreach_campaign_logs(campaign_id);
CREATE INDEX IF NOT EXISTS outreach_campaign_logs_lead_idx ON outreach_campaign_logs(lead_id);

ALTER TABLE outreach_campaign_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outreach_campaign_logs_select" ON outreach_campaign_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "outreach_campaign_logs_insert" ON outreach_campaign_logs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "outreach_campaign_logs_update" ON outreach_campaign_logs
  FOR UPDATE TO authenticated USING (true);
