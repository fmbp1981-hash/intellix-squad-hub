-- =============================================================================
-- Prompt B — IntelliX CRM nativo + Infra Ágata (COO Digital)
-- =============================================================================

-- Garantir extensions usadas pelos crons/triggers
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- -----------------------------------------------------------------------------
-- CRM: LEADS
-- -----------------------------------------------------------------------------
CREATE TABLE public.leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name    text NOT NULL,
  contact_name    text,
  contact_email   text,
  contact_phone   text,
  source          text NOT NULL CHECK (source IN
                    ('inbound_site','inbound_referral','outbound_prospect',
                     'event','linkedin','whatsapp','indication')),
  segment         text,
  geography       text,
  ticket_estimate numeric,
  status          text NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new','contacted','qualifying','qualified','disqualified','converted')),
  score           int CHECK (score BETWEEN 0 AND 100),
  score_reasons   jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes           text,
  last_contact_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads REPLICA IDENTITY FULL;
CREATE POLICY "admin_all_leads" ON public.leads FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- -----------------------------------------------------------------------------
-- CRM: DEALS
-- -----------------------------------------------------------------------------
CREATE TABLE public.deals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  company_name    text NOT NULL,
  scope_summary   text NOT NULL,
  pricing_model   text CHECK (pricing_model IN ('fixed','hourly','retainer','success_fee','hybrid')),
  value           numeric NOT NULL,
  probability     int CHECK (probability BETWEEN 0 AND 100),
  expected_close  date,
  status          text NOT NULL DEFAULT 'discovery'
                    CHECK (status IN ('discovery','proposal','negotiation','won','lost','stalled')),
  lost_reason     text,
  proposal_url    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals REPLICA IDENTITY FULL;
CREATE POLICY "admin_all_deals" ON public.deals FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- -----------------------------------------------------------------------------
-- CRM: CONTRACTS
-- -----------------------------------------------------------------------------
CREATE TABLE public.contracts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id       uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  client_name   text NOT NULL,
  client_cnpj   text,
  scope_md      text NOT NULL,
  total_value   numeric NOT NULL,
  payment_terms jsonb NOT NULL DEFAULT '[]'::jsonb,
  start_date    date NOT NULL,
  end_date      date,
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','sent','signed','active','completed','cancelled')),
  signed_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts REPLICA IDENTITY FULL;
CREATE POLICY "admin_all_contracts" ON public.contracts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- -----------------------------------------------------------------------------
-- CRM: INVOICES
-- -----------------------------------------------------------------------------
CREATE TABLE public.invoices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id  uuid REFERENCES public.contracts(id) ON DELETE CASCADE,
  number       text UNIQUE NOT NULL,
  amount       numeric NOT NULL,
  milestone    text,
  issue_date   date NOT NULL,
  due_date     date NOT NULL,
  paid_at      timestamptz,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','sent','paid','overdue','cancelled')),
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices REPLICA IDENTITY FULL;
CREATE POLICY "admin_all_invoices" ON public.invoices FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- -----------------------------------------------------------------------------
-- CRM: ENGAGEMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE public.engagements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id   uuid REFERENCES public.contracts(id) ON DELETE CASCADE,
  workspace_id  uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  name          text NOT NULL,
  start_date    date NOT NULL,
  end_date      date,
  status        text NOT NULL DEFAULT 'planning'
                  CHECK (status IN ('planning','active','blocked','completed','cancelled')),
  blocker_note  text,
  health        text NOT NULL DEFAULT 'green'
                  CHECK (health IN ('green','yellow','red')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagements REPLICA IDENTITY FULL;
CREATE POLICY "admin_all_engagements" ON public.engagements FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- -----------------------------------------------------------------------------
-- updated_at triggers (CRM)
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_leads_updated_at      BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_deals_updated_at      BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_contracts_updated_at  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_engagements_updated_at BEFORE UPDATE ON public.engagements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Indexes
CREATE INDEX idx_leads_status       ON public.leads(status);
CREATE INDEX idx_leads_created      ON public.leads(created_at DESC);
CREATE INDEX idx_deals_status       ON public.deals(status);
CREATE INDEX idx_invoices_overdue   ON public.invoices(due_date) WHERE status IN ('pending','sent');
CREATE INDEX idx_engagements_status ON public.engagements(status);

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.engagements;

-- =============================================================================
-- Ágata: BRIEFINGS, DIRECTIVES, TOKEN USAGE
-- =============================================================================

CREATE TABLE public.gestao_briefings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type              text NOT NULL CHECK (type IN ('daily_standup','on_demand','incident_response','weekly_review')),
  triggered_by      text NOT NULL DEFAULT 'schedule' CHECK (triggered_by IN ('schedule','felipe','auto')),
  trigger_question  text,
  job_id            uuid,
  content_markdown  text NOT NULL,
  insights          jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations   jsonb NOT NULL DEFAULT '[]'::jsonb,
  directives_json   jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gestao_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gestao_briefings REPLICA IDENTITY FULL;
CREATE POLICY "admin_all_briefings_gestao" ON public.gestao_briefings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.gestao_briefings;

CREATE TABLE public.gestao_directives (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id         uuid REFERENCES public.gestao_briefings(id) ON DELETE SET NULL,
  target_department   text NOT NULL,
  job_id              text NOT NULL,
  job_input           jsonb NOT NULL DEFAULT '{}'::jsonb,
  rationale           text,
  priority            text NOT NULL DEFAULT 'normal'
                        CHECK (priority IN ('critical','high','normal','low')),
  okr_id              uuid REFERENCES public.okrs(id) ON DELETE SET NULL,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','dispatched','completed','cancelled','rejected')),
  cancelled_reason    text,
  approved_by         uuid,
  dispatched_job_id   uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  approved_at         timestamptz,
  dispatched_at       timestamptz,
  completed_at        timestamptz
);
ALTER TABLE public.gestao_directives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gestao_directives REPLICA IDENTITY FULL;
CREATE POLICY "admin_all_gestao_directives" ON public.gestao_directives FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.gestao_directives;

CREATE TABLE public.token_usage (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope           text NOT NULL,
  period_month    text NOT NULL,
  total_tokens    bigint NOT NULL DEFAULT 0,
  total_cost_usd  numeric NOT NULL DEFAULT 0,
  budget_usd      numeric,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, period_month)
);
ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_token_usage" ON public.token_usage FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- Adições em tabelas existentes
-- =============================================================================

-- okrs: campos do prompt B
ALTER TABLE public.okrs
  ADD COLUMN IF NOT EXISTS key_result    text,
  ADD COLUMN IF NOT EXISTS target_value  numeric,
  ADD COLUMN IF NOT EXISTS current_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metric_unit   text,
  ADD COLUMN IF NOT EXISTS status        text NOT NULL DEFAULT 'on_track'
    CHECK (status IN ('on_track','at_risk','off_track','completed')),
  ADD COLUMN IF NOT EXISTS active        boolean NOT NULL DEFAULT true;

-- agent_configs: system prompt e identificadores
ALTER TABLE public.agent_configs
  ADD COLUMN IF NOT EXISTS system_prompt text,
  ADD COLUMN IF NOT EXISTS agent_key     text,
  ADD COLUMN IF NOT EXISTS squad_name    text;

-- internal_jobs: campos do novo dispatcher
ALTER TABLE public.internal_jobs
  ADD COLUMN IF NOT EXISTS job_id              text,
  ADD COLUMN IF NOT EXISTS job_input           jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS trigger_source      text DEFAULT 'manual'
    CHECK (trigger_source IN ('manual','scheduled','gestao_directive','auto')),
  ADD COLUMN IF NOT EXISTS parent_directive_id uuid REFERENCES public.gestao_directives(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estimated_tokens    int,
  ADD COLUMN IF NOT EXISTS sla_deadline        timestamptz;

-- =============================================================================
-- Triggers Postgres → crm-event-handler (via pg_net)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trigger_crm_event(p_event text, p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/crm-event-handler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(current_setting('app.internal_secret', true), '')
    ),
    body := jsonb_build_object('eventType', p_event, 'entityId', p_id::text)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_lead_qualified()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'qualified' AND OLD.status IS DISTINCT FROM 'qualified' THEN
    PERFORM public.trigger_crm_event('lead_qualified', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_lead_qualified AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.trigger_lead_qualified();

CREATE OR REPLACE FUNCTION public.trigger_deal_won()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'won' AND OLD.status IS DISTINCT FROM 'won' THEN
    PERFORM public.trigger_crm_event('deal_won', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_deal_won AFTER UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.trigger_deal_won();

CREATE OR REPLACE FUNCTION public.trigger_contract_signed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'signed' AND OLD.status IS DISTINCT FROM 'signed' THEN
    PERFORM public.trigger_crm_event('contract_signed', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_contract_signed AFTER UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.trigger_contract_signed();

CREATE OR REPLACE FUNCTION public.trigger_engagement_blocked()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'blocked' AND OLD.status IS DISTINCT FROM 'blocked' THEN
    PERFORM public.trigger_crm_event('engagement_blocked', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_engagement_blocked AFTER UPDATE ON public.engagements
  FOR EACH ROW EXECUTE FUNCTION public.trigger_engagement_blocked();

-- =============================================================================
-- Cron jobs (pg_cron) — 4 schedules
-- =============================================================================

-- Configura URL global (admin pode sobrescrever depois com ALTER DATABASE)
DO $$ BEGIN
  PERFORM set_config('app.supabase_url', 'https://hynadwlwrscvjubryqlg.supabase.co', false);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Daily Standup 11h UTC (8h Recife)
SELECT cron.schedule(
  'intellix-daily-standup',
  '0 11 * * *',
  $cron$
    SELECT net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/gestao-trigger',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(current_setting('app.internal_secret', true), '')
      ),
      body := '{"type":"daily_standup"}'::jsonb
    );
  $cron$
);

SELECT cron.schedule(
  'intellix-weekly-review',
  '0 21 * * 0',
  $cron$
    SELECT net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/gestao-trigger',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(current_setting('app.internal_secret', true), '')
      ),
      body := '{"type":"weekly_review"}'::jsonb
    );
  $cron$
);

SELECT cron.schedule(
  'intellix-notifications',
  '*/5 * * * *',
  $cron$
    SELECT net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/notification-dispatcher',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(current_setting('app.internal_secret', true), '')
      ),
      body := '{}'::jsonb
    );
  $cron$
);

SELECT cron.schedule(
  'intellix-overdue-check',
  '0 12 * * *',
  $cron$
    SELECT net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/crm-event-handler',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(current_setting('app.internal_secret', true), '')
      ),
      body := '{"eventType":"check_overdue"}'::jsonb
    );
  $cron$
);

-- =============================================================================
-- Seed: OKRs Q2 2026
-- =============================================================================
INSERT INTO public.okrs (quarter, department, objective, key_result, metric_unit, target_value, current_value, key_results, progress, status, active)
VALUES
  ('2026-Q2', 'gestao',     'Crescer receita recorrente da IntelliX', 'MRR de R$ 50.000',                 'BRL',   50000, 0, '[]'::jsonb, 0, 'on_track', true),
  ('2026-Q2', 'comercial',  'Crescer receita recorrente da IntelliX', 'Fechar 6 novos contratos',         'count', 6,     0, '[]'::jsonb, 0, 'on_track', true),
  ('2026-Q2', 'marketing',  'Estabelecer presença digital',           'Publicar 12 cases no LinkedIn',    'count', 12,    0, '[]'::jsonb, 0, 'on_track', true),
  ('2026-Q2', 'operacoes',  'Excelência operacional',                 'NPS médio >= 8 em engagements',    'NPS',   8,     0, '[]'::jsonb, 0, 'on_track', true);