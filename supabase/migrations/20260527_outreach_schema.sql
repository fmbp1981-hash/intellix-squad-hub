-- Squad SDR Autônomo — Schema de Outreach

CREATE TABLE IF NOT EXISTS icp_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  pain_description TEXT NOT NULL,
  qualification_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  primary_channel TEXT NOT NULL DEFAULT 'whatsapp',
  secondary_channel TEXT,
  message_template_key TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outreach_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  responsible_name TEXT,
  responsible_title TEXT,
  segment_id UUID REFERENCES icp_segments(id),
  company_size TEXT,
  contact_channel TEXT NOT NULL,
  contact_value TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  google_place_id TEXT UNIQUE,
  website_url TEXT,
  linkedin_url TEXT,
  instagram_url TEXT,
  probable_pain TEXT,
  qualification_score INTEGER DEFAULT 0 CHECK (qualification_score BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'prospected'
    CHECK (status IN ('prospected', 'analyzing', 'briefed', 'pending_approval',
                      'sent', 'replied', 'meeting_scheduled', 'won', 'lost', 'archived')),
  heat_score INTEGER DEFAULT 0 CHECK (heat_score BETWEEN 0 AND 10),
  raw_places_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES outreach_leads(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  segment TEXT NOT NULL,
  main_pain TEXT NOT NULL,
  intellix_solution TEXT NOT NULL,
  sales_angle TEXT NOT NULL,
  recommended_tone TEXT NOT NULL CHECK (recommended_tone IN ('formal', 'descontraido', 'tecnico')),
  probable_objection TEXT,
  objection_counter TEXT,
  ideal_channel TEXT NOT NULL,
  sources_analyzed JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_context JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  model_used TEXT NOT NULL DEFAULT 'gpt-4o',
  UNIQUE(lead_id)
);

CREATE OR REPLACE FUNCTION update_outreach_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER outreach_leads_updated_at
  BEFORE UPDATE ON outreach_leads
  FOR EACH ROW EXECUTE FUNCTION update_outreach_leads_updated_at();

ALTER TABLE icp_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "icp_segments_select" ON icp_segments FOR SELECT TO authenticated USING (true);
CREATE POLICY "outreach_leads_select" ON outreach_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "outreach_leads_insert" ON outreach_leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "outreach_leads_update" ON outreach_leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "lead_briefings_select" ON lead_briefings FOR SELECT TO authenticated USING (true);

-- Segmentos ICP iniciais
INSERT INTO icp_segments (name, display_name, pain_description, qualification_signals, primary_channel, secondary_channel) VALUES
('clinicas', 'Clínicas e Consultórios', 'Agendamento e follow-up manuais, perda de pacientes fora do horário comercial', '["site sem chatbot", "avaliações reclamando de demora no agendamento", "vagas recepcionista abertas"]'::jsonb, 'whatsapp', 'email'),
('imobiliarias', 'Imobiliárias e Corretores', 'Qualificação manual de leads e perda de compradores fora do horário', '["site sem chat ao vivo", "muitos anúncios sem resposta automatizada", "vagas SDR abertas"]'::jsonb, 'linkedin', 'whatsapp'),
('ecommerce', 'E-commerces', 'Atendimento e pós-venda intensivos em humano, alto volume de tickets', '["suporte apenas por email", "tempo de resposta lento no ReclameAqui", "sem chatbot no site"]'::jsonb, 'whatsapp', 'email'),
('contabilidade', 'Escritórios de Contabilidade', 'Comunicação repetitiva e relatórios manuais para dezenas de clientes', '["sem portal do cliente", "vagas assistente administrativo", "site institucional sem área do cliente"]'::jsonb, 'linkedin', 'email'),
('construtoras', 'Construtoras e Incorporadoras', 'Prospecção e qualificação lenta de compradores de imóveis', '["sem simulador no site", "atendimento só por telefone", "vagas corretores internos"]'::jsonb, 'linkedin', 'whatsapp'),
('servicos_locais', 'Prestadores de Serviço Local', 'Orçamento, agendamento e cobrança descentralizados', '["Google Maps sem resposta automática", "avaliações reclamando de demora", "sem site ou site desatualizado"]'::jsonb, 'whatsapp', 'instagram')
ON CONFLICT DO NOTHING;
