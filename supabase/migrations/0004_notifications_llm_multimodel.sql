-- ============================================================
-- 0004_notifications_llm_multimodel.sql
--
-- 1. Corrige notifications (colunas ausentes usadas pelo notification-dispatcher)
-- 2. Adiciona recommended_model + cost_tier em llm_configs (suporte multi-provider UI)
-- ============================================================

-- ── notifications ────────────────────────────────────────────
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS status     text        NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS channel    text        NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS priority   text        NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS category   text,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS sent_at    timestamptz,
  ADD COLUMN IF NOT EXISTS error      text;

-- Índice para o dispatcher (busca pending <= now())
CREATE INDEX IF NOT EXISTS idx_notifications_status_scheduled
  ON public.notifications (status, scheduled_for)
  WHERE status = 'pending';

-- ── llm_configs ───────────────────────────────────────────────
ALTER TABLE public.llm_configs
  ADD COLUMN IF NOT EXISTS recommended_model text,
  ADD COLUMN IF NOT EXISTS cost_tier text CHECK (cost_tier IN ('low', 'medium', 'high'));

-- Backfill: recommended_model = modelo atual; cost_tier por padrão de nomenclatura
UPDATE public.llm_configs
SET
  recommended_model = model,
  cost_tier = CASE
    WHEN model ILIKE '%opus%'
      OR model ILIKE '%-pro%'
      OR model IN ('openai/gpt-5', 'google/gemini-3.1-pro-preview') THEN 'high'
    WHEN model ILIKE '%flash%'
      OR model ILIKE '%mini%'
      OR model ILIKE '%sonnet%'
      OR model IN ('openai/gpt-5-mini', 'google/gemini-3-flash-preview') THEN 'medium'
    ELSE 'low'
  END
WHERE recommended_model IS NULL;
