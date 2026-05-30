-- supabase/migrations/20260529_site_proposals.sql

ALTER TABLE lead_briefings
  ADD COLUMN IF NOT EXISTS site_audit_score INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS redesign_signals JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS site_proposals (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id            UUID NOT NULL REFERENCES outreach_leads(id) ON DELETE CASCADE,
  prd_text           TEXT NOT NULL,
  lovable_url        TEXT NOT NULL,
  redesign_signals   JSONB NOT NULL DEFAULT '[]'::jsonb,
  site_audit_score   INTEGER NOT NULL DEFAULT 0 CHECK (site_audit_score BETWEEN 0 AND 100),
  status             TEXT NOT NULL DEFAULT 'ready'
                       CHECK (status IN ('ready', 'sent', 'rejected')),
  generated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
);

ALTER TABLE site_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_proposals_select" ON site_proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "site_proposals_insert" ON site_proposals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "site_proposals_update" ON site_proposals FOR UPDATE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_site_proposals_lead_id ON site_proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_site_proposals_status ON site_proposals(status);
