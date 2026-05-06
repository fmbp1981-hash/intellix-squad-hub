
-- llm_configs
CREATE TABLE public.llm_configs (
  config_key text PRIMARY KEY,
  provider text NOT NULL,
  model text NOT NULL,
  fallback_provider text,
  fallback_model text,
  temperature numeric NOT NULL DEFAULT 0.7,
  max_tokens integer NOT NULL DEFAULT 4096,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.llm_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_llm_configs" ON public.llm_configs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_llm_configs_updated BEFORE UPDATE ON public.llm_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.llm_configs (config_key, provider, model, fallback_provider, fallback_model, temperature, max_tokens) VALUES
  ('default',                            'gemini', 'google/gemini-3-flash-preview',         'openai', 'openai/gpt-5-mini', 0.7, 4096),
  ('squad:default:lead-analyst',         'gemini', 'google/gemini-3.1-pro-preview',         'openai', 'openai/gpt-5',      0.5, 8192),
  ('squad:default:specialist',           'gemini', 'google/gemini-3-flash-preview',         'openai', 'openai/gpt-5-mini', 0.7, 4096),
  ('squad:default:strategist',           'gemini', 'google/gemini-3.1-pro-preview',         'openai', 'openai/gpt-5',      0.5, 8192),
  ('squad:default:reviewer',             'gemini', 'google/gemini-3.1-flash-lite-preview',  'openai', 'openai/gpt-5-nano', 0.3, 2048),
  ('internal:gestao:daily-standup',      'gemini', 'google/gemini-3.1-pro-preview',         'openai', 'openai/gpt-5',      0.5, 4096),
  ('internal:gestao:weekly-review',      'gemini', 'google/gemini-3.1-pro-preview',         'openai', 'openai/gpt-5',      0.5, 8192),
  ('internal:gestao:on-demand-brief',    'gemini', 'google/gemini-3-flash-preview',         'openai', 'openai/gpt-5-mini', 0.6, 4096),
  ('internal:gestao:incident-response',  'gemini', 'google/gemini-3-flash-preview',         'openai', 'openai/gpt-5-mini', 0.4, 4096),
  ('job-weight:heavy',                   'gemini', 'google/gemini-3.1-pro-preview',         'openai', 'openai/gpt-5',      0.5, 8192),
  ('job-weight:light',                   'gemini', 'google/gemini-3.1-flash-lite-preview',  'openai', 'openai/gpt-5-nano', 0.5, 2048);

-- whatsapp_configs (single-row, editable via UI)
CREATE TABLE public.whatsapp_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_url text NOT NULL,
  instance_token text NOT NULL,
  instance_name text,
  admin_number text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_whatsapp_configs" ON public.whatsapp_configs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_whatsapp_configs_updated BEFORE UPDATE ON public.whatsapp_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
