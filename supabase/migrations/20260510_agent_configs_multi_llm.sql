-- =============================================================================
-- agent_configs multi-LLM — provider e modelo por agente
-- Spec: OpenSquad_Workflow_E2E_PreDev_v2.md (seção 1.1)
-- Permite trocar provider/modelo de cada agente sem deploy.
-- Mantém llm_config_key por compat (drop só na Fase 3).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enum: providers suportados pela LLM Factory
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.llm_provider AS ENUM ('anthropic','openai','google');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- agent_configs: novas colunas para LLM e operação
-- -----------------------------------------------------------------------------
ALTER TABLE public.agent_configs
  ADD COLUMN IF NOT EXISTS llm_provider     public.llm_provider,
  ADD COLUMN IF NOT EXISTS llm_model        text,
  ADD COLUMN IF NOT EXISTS llm_temperature  numeric NOT NULL DEFAULT 0.3,
  ADD COLUMN IF NOT EXISTS llm_max_tokens   integer NOT NULL DEFAULT 4096,
  ADD COLUMN IF NOT EXISTS jobs             text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS wip_limit        integer NOT NULL DEFAULT 3
    CHECK (wip_limit BETWEEN 1 AND 20);

-- Backfill via llm_config_key + llm_configs (best-effort)
-- Mapeia provider antigo (gemini/anthropic/openai/etc.) para enum novo.
UPDATE public.agent_configs ac
SET
  llm_provider = CASE
    WHEN lc.provider IN ('gemini','google') THEN 'google'::public.llm_provider
    WHEN lc.provider = 'anthropic' THEN 'anthropic'::public.llm_provider
    WHEN lc.provider = 'openai' THEN 'openai'::public.llm_provider
    ELSE 'google'::public.llm_provider
  END,
  llm_model = CASE
    -- Mapeia modelos Lovable-prefixed para nomes nativos
    WHEN lc.model LIKE 'google/gemini-3.1-pro%'        THEN 'gemini-2.0-pro'
    WHEN lc.model LIKE 'google/gemini-3-flash%'        THEN 'gemini-2.0-flash'
    WHEN lc.model LIKE 'google/gemini-3.1-flash-lite%' THEN 'gemini-1.5-flash'
    WHEN lc.model LIKE 'google/%' THEN 'gemini-2.0-flash'
    WHEN lc.model LIKE 'anthropic/%' THEN replace(lc.model, 'anthropic/', '')
    WHEN lc.model LIKE 'openai/gpt-5-mini%' THEN 'gpt-4o-mini'
    WHEN lc.model LIKE 'openai/gpt-5-nano%' THEN 'gpt-4o-mini'
    WHEN lc.model LIKE 'openai/gpt-5%' THEN 'gpt-4o'
    WHEN lc.model LIKE 'openai/%' THEN replace(lc.model, 'openai/', '')
    ELSE lc.model
  END,
  llm_temperature = COALESCE(lc.temperature, 0.3),
  llm_max_tokens = COALESCE(lc.max_tokens, 4096)
FROM public.llm_configs lc
WHERE ac.llm_config_key = lc.config_key
  AND ac.llm_provider IS NULL;

-- Default seguro para agentes sem mapping: claude-sonnet-4-5 da Anthropic
UPDATE public.agent_configs
SET
  llm_provider = 'anthropic',
  llm_model = 'claude-sonnet-4-5'
WHERE llm_provider IS NULL OR llm_model IS NULL OR llm_model = '';

-- A partir de agora provider/model são obrigatórios
ALTER TABLE public.agent_configs
  ALTER COLUMN llm_provider SET NOT NULL,
  ALTER COLUMN llm_model SET NOT NULL;

-- WIP por agente (default da spec): polimórficos = 1, demais = 3
UPDATE public.agent_configs SET wip_limit = 1
WHERE name IN ('Ana','Bruno','Beatriz','Roberto');

-- -----------------------------------------------------------------------------
-- agent_runs — log centralizado de toda invocação LLM via llm-invoke
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.agent_run_status AS ENUM
    ('pending','running','completed','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.agent_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name        text NOT NULL,
  agent_id          uuid REFERENCES public.agent_configs(id) ON DELETE SET NULL,
  job_name          text,
  engagement_id     uuid REFERENCES public.engagements(id) ON DELETE SET NULL,
  llm_provider      public.llm_provider NOT NULL,
  llm_model         text NOT NULL,
  input             jsonb NOT NULL DEFAULT '{}'::jsonb,
  output            text,
  tokens_in         integer NOT NULL DEFAULT 0,
  tokens_out        integer NOT NULL DEFAULT 0,
  cost_usd          numeric NOT NULL DEFAULT 0,
  duration_ms       integer,
  status            public.agent_run_status NOT NULL DEFAULT 'pending',
  error             text,
  idempotency_key   text NOT NULL,
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON public.agent_runs(agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_engagement ON public.agent_runs(engagement_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON public.agent_runs(status);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs REPLICA IDENTITY FULL;

DO $$ BEGIN
  CREATE POLICY "admin_all_agent_runs" ON public.agent_runs FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_runs;

-- -----------------------------------------------------------------------------
-- run_steps: registrar provider/model usados (para auditoria por step)
-- -----------------------------------------------------------------------------
ALTER TABLE public.run_steps
  ADD COLUMN IF NOT EXISTS llm_provider public.llm_provider,
  ADD COLUMN IF NOT EXISTS llm_model    text,
  ADD COLUMN IF NOT EXISTS agent_run_id uuid REFERENCES public.agent_runs(id) ON DELETE SET NULL;

-- =============================================================================
-- ROLLBACK (referência):
--   ALTER TABLE public.run_steps DROP COLUMN agent_run_id, DROP COLUMN llm_model, DROP COLUMN llm_provider;
--   DROP TABLE public.agent_runs;
--   DROP TYPE public.agent_run_status;
--   ALTER TABLE public.agent_configs
--     DROP COLUMN wip_limit, DROP COLUMN jobs,
--     DROP COLUMN llm_max_tokens, DROP COLUMN llm_temperature,
--     DROP COLUMN llm_model, DROP COLUMN llm_provider;
--   DROP TYPE public.llm_provider;
-- =============================================================================
