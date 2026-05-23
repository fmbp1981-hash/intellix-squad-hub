-- Fase D: WhatsApp multi-provider inbound + config
-- Creates: leads, whatsapp_configs, whatsapp_conversations

-- ────────────────────────────────────────────
-- 1. LEADS (minimal CRM table for WA funnel)
-- ────────────────────────────────────────────
CREATE TABLE public.leads (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           text        NOT NULL UNIQUE,
  name            text,
  email           text,
  company         text,
  segment         text,
  status          text        NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','contacting','qualified','proposal','meeting_scheduled','closed_won','closed_lost','archived')),
  assigned_agent  text        NOT NULL DEFAULT 'bia'
                  CHECK (assigned_agent IN ('bia','carlos','felipe')),
  source          text        DEFAULT 'whatsapp',
  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_admin_all" ON public.leads
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ────────────────────────────────────────────
-- 2. WHATSAPP_CONFIGS (multi-provider)
-- ────────────────────────────────────────────
CREATE TABLE public.whatsapp_configs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        text        NOT NULL DEFAULT 'evolution'
                  CHECK (provider IN ('evolution','whatsapp_business')),
  display_name    text        NOT NULL DEFAULT '',
  -- Evolution API fields
  instance_url    text,
  api_key         text,
  instance_name   text,
  -- WhatsApp Business (Meta) fields
  phone_number_id text,
  access_token    text,
  verify_token    text,
  -- Common
  admin_number    text,
  active          boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_configs_admin_all" ON public.whatsapp_configs
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ────────────────────────────────────────────
-- 3. WHATSAPP_CONVERSATIONS
-- ────────────────────────────────────────────
CREATE TABLE public.whatsapp_conversations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid        REFERENCES public.leads(id) ON DELETE CASCADE,
  phone           text        NOT NULL UNIQUE,
  current_agent   text        NOT NULL DEFAULT 'bia'
                  CHECK (current_agent IN ('bia','carlos','felipe')),
  status          text        NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','waiting','closed')),
  history         jsonb       NOT NULL DEFAULT '[]',
  last_message_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_conversations_admin_all" ON public.whatsapp_conversations
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ────────────────────────────────────────────
-- 4. UPDATED_AT TRIGGERS
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fase_d_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.fase_d_set_updated_at();

CREATE TRIGGER whatsapp_configs_set_updated_at
  BEFORE UPDATE ON public.whatsapp_configs
  FOR EACH ROW EXECUTE FUNCTION public.fase_d_set_updated_at();

CREATE TRIGGER whatsapp_conversations_set_updated_at
  BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.fase_d_set_updated_at();
