-- Coluna de Calendly por segmento ICP
ALTER TABLE icp_segments
  ADD COLUMN IF NOT EXISTS calendly_link TEXT;

-- Respostas recebidas de prospects
CREATE TABLE IF NOT EXISTS outreach_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES outreach_leads(id) ON DELETE CASCADE,
  inbound_message TEXT NOT NULL,
  intent TEXT NOT NULL DEFAULT 'unknown'
    CHECK (intent IN ('interest', 'doubt', 'objection', 'disinterest', 'unknown')),
  intent_confidence INTEGER DEFAULT 0 CHECK (intent_confidence BETWEEN 0 AND 100),
  draft_reply TEXT,
  approved_reply TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'sent', 'ignored')),
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE outreach_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outreach_responses_select" ON outreach_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "outreach_responses_insert" ON outreach_responses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "outreach_responses_update" ON outreach_responses FOR UPDATE TO authenticated USING (true);
