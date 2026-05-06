
-- 1. email_templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  subject text NOT NULL,
  html text NOT NULL,
  text text,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_email_templates ON public.email_templates;
CREATE POLICY read_email_templates ON public.email_templates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS admin_write_email_templates ON public.email_templates;
CREATE POLICY admin_write_email_templates ON public.email_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_email_templates_updated ON public.email_templates;
CREATE TRIGGER trg_email_templates_updated BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.email_templates (key, name, description, subject, html, variables) VALUES
  ('deal_won_welcome', 'Boas-vindas (Deal ganho)', 'Enviado ao cliente após vitória do deal',
   'Bem-vindo(a), {{empresa}}!',
   '<h2>Olá {{nome}},</h2><p>Estamos animados em iniciar o projeto da <strong>{{empresa}}</strong>. Em breve nossa equipe entrará em contato para o kickoff.</p><p>Abraços,<br/>Equipe</p>',
   '["nome","empresa"]'::jsonb),
  ('lead_qualified_followup', 'Follow-up de lead qualificado', 'Disparado quando lead atinge status qualified',
   '{{empresa}} — próximos passos',
   '<p>Olá {{nome}},</p><p>Recebemos suas informações e estamos preparando uma proposta para a <strong>{{empresa}}</strong>. Posso agendar uma call esta semana?</p>',
   '["nome","empresa"]'::jsonb),
  ('contract_signed_kickoff', 'Kickoff de contrato', 'Enviado quando contrato é assinado',
   'Contrato assinado — vamos começar!',
   '<p>Olá {{nome}},</p><p>Contrato da <strong>{{empresa}}</strong> assinado com sucesso. Valor: <strong>R$ {{valor}}</strong>. Em até 48h enviamos a agenda do kickoff.</p>',
   '["nome","empresa","valor"]'::jsonb),
  ('invoice_overdue_reminder', 'Lembrete de fatura vencida', 'Lembrete amistoso de pagamento',
   'Fatura {{numero}} em aberto',
   '<p>Olá {{nome}},</p><p>Identificamos que a fatura <strong>{{numero}}</strong> no valor de <strong>R$ {{valor}}</strong> venceu em {{vencimento}}. Caso já tenha pago, desconsidere.</p>',
   '["nome","numero","valor","vencimento"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. crm_pipeline_stages
CREATE TABLE IF NOT EXISTS public.crm_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  "order" integer NOT NULL,
  probability integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6366f1',
  is_won boolean NOT NULL DEFAULT false,
  is_lost boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_pipeline_stages ON public.crm_pipeline_stages;
CREATE POLICY read_pipeline_stages ON public.crm_pipeline_stages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS admin_write_pipeline_stages ON public.crm_pipeline_stages;
CREATE POLICY admin_write_pipeline_stages ON public.crm_pipeline_stages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_pipeline_stages_updated ON public.crm_pipeline_stages;
CREATE TRIGGER trg_pipeline_stages_updated BEFORE UPDATE ON public.crm_pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.crm_pipeline_stages (key, name, "order", probability, color, is_won, is_lost) VALUES
  ('discovery',    'Discovery',     1, 10,  '#94a3b8', false, false),
  ('proposal',     'Proposta',      2, 40,  '#3b82f6', false, false),
  ('negotiation',  'Negociação',    3, 70,  '#a855f7', false, false),
  ('won',          'Ganho',         4, 100, '#22c55e', true,  false),
  ('lost',         'Perdido',       5, 0,   '#ef4444', false, true),
  ('stalled',      'Stalled',       6, 0,   '#f59e0b', false, false)
ON CONFLICT (key) DO NOTHING;
