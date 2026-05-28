-- outreach_messages — mensagens geradas pelos Agentes 5+6 (Copywriter + Humanizer)

CREATE TABLE IF NOT EXISTS outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES outreach_leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'linkedin', 'instagram')),
  message_text TEXT NOT NULL,
  humanization_score INTEGER NOT NULL DEFAULT 0 CHECK (humanization_score BETWEEN 0 AND 10),
  humanizer_issues JSONB DEFAULT '[]'::jsonb,
  humanizer_suggestions JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  approved_by TEXT,
  model_used TEXT NOT NULL DEFAULT 'gpt-4o',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
);

ALTER TABLE outreach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outreach_messages_select" ON outreach_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "outreach_messages_insert" ON outreach_messages
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "outreach_messages_update" ON outreach_messages
  FOR UPDATE TO authenticated USING (true);
