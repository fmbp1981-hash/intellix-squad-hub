-- =============================================================================
-- engagement_briefs v2 — briefing v2 da Bia (SDR)
-- Spec: OpenSquad_Workflow_E2E_PreDev_v2.md (seção 3.4 e seção 7)
-- Captura tipo de solução esperado pelo cliente para classificação preliminar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums novos
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.team_will_operate AS ENUM ('yes','with_support','no');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.brief_urgency AS ENUM
    ('lt_1m','1_3m','3_6m','gt_6m','none');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.brief_status AS ENUM
    ('drafting','completed','qualified','disqualified');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- engagement_briefs — tabela principal v2
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.engagement_briefs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id                  uuid REFERENCES public.leads(id) ON DELETE SET NULL,

  -- Campos básicos do briefing (mantidos da v1)
  vertical                 text,
  problem                  text,
  current_stack            text,
  budget                   text,
  timeline                 text,
  stakeholders             text,
  qualification_score      int CHECK (qualification_score BETWEEN 0 AND 100),

  -- Campos novos v2 — classificação preliminar de tipo de solução
  solution_type_hint       public.engagement_type NOT NULL DEFAULT 'undetermined',
  expectation_categories   text[] NOT NULL DEFAULT '{}',
  team_will_operate        public.team_will_operate,
  required_integrations    text,
  urgency                  public.brief_urgency DEFAULT 'none',

  -- BANT-S (Budget, Authority, Need, Timing, Strategic Fit)
  bant_budget              boolean,
  bant_authority           boolean,
  bant_need                boolean,
  bant_timing              boolean,
  bant_strategic_fit       boolean,

  -- Estado
  status                   public.brief_status NOT NULL DEFAULT 'drafting',
  consented_at             timestamptz,
  completed_at             timestamptz,
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_briefs_lead ON public.engagement_briefs(lead_id);
CREATE INDEX IF NOT EXISTS idx_engagement_briefs_type ON public.engagement_briefs(solution_type_hint);
CREATE INDEX IF NOT EXISTS idx_engagement_briefs_status ON public.engagement_briefs(status);

ALTER TABLE public.engagement_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_briefs REPLICA IDENTITY FULL;

DO $$ BEGIN
  CREATE POLICY "admin_all_engagement_briefs" ON public.engagement_briefs FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TRIGGER trg_engagement_briefs_updated BEFORE UPDATE ON public.engagement_briefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.engagement_briefs;

-- -----------------------------------------------------------------------------
-- Função: classifica solution_type_hint a partir de expectation_categories
-- Lógica da seção 3.4 da spec.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_classify_solution_hint(
  p_categories text[]
) RETURNS public.engagement_type LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  has_strategy   boolean := 'strategy'      = ANY(p_categories);
  has_agent      boolean := 'agent'         = ANY(p_categories);
  has_automation boolean := 'automation'    = ANY(p_categories);
  has_product    boolean := 'product'       = ANY(p_categories);
  has_training   boolean := 'training'      = ANY(p_categories);
  has_unsure     boolean := 'unsure'        = ANY(p_categories);
  active_count   int := array_length(p_categories, 1);
BEGIN
  IF p_categories IS NULL OR active_count IS NULL OR active_count = 0 THEN
    RETURN 'undetermined';
  END IF;
  IF has_unsure THEN
    RETURN 'undetermined';
  END IF;
  IF active_count >= 2 AND NOT (active_count = 2 AND has_agent AND has_automation) THEN
    RETURN 'hybrid';
  END IF;
  IF has_product THEN RETURN 'product'; END IF;
  IF has_agent THEN RETURN 'agent'; END IF;
  IF has_automation THEN RETURN 'automation'; END IF;
  IF has_strategy THEN RETURN 'consulting'; END IF;
  IF has_training THEN RETURN 'consulting'; END IF;
  RETURN 'undetermined';
END;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: auto-preenche solution_type_hint quando expectation_categories muda
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_engagement_brief_classify()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.expectation_categories IS DISTINCT FROM
     COALESCE(OLD.expectation_categories, '{}'::text[]) THEN
    NEW.solution_type_hint := public.fn_classify_solution_hint(NEW.expectation_categories);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brief_classify ON public.engagement_briefs;
CREATE TRIGGER trg_brief_classify
  BEFORE INSERT OR UPDATE OF expectation_categories ON public.engagement_briefs
  FOR EACH ROW EXECUTE FUNCTION public.tg_engagement_brief_classify();

-- -----------------------------------------------------------------------------
-- Backfill best-effort a partir de briefings legados
-- (mapeia campos quando possível; deixa solution_type_hint = undetermined)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='briefings') THEN
    INSERT INTO public.engagement_briefs (
      lead_id, problem, status, created_at
    )
    SELECT
      NULL,
      COALESCE(b.content, b.summary, ''),
      'completed',
      b.created_at
    FROM public.briefings b
    WHERE NOT EXISTS (
      SELECT 1 FROM public.engagement_briefs eb
      WHERE eb.created_at = b.created_at
    )
    ON CONFLICT DO NOTHING;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- backfill é best-effort; não bloqueia migration
  RAISE NOTICE 'backfill briefings → engagement_briefs pulado: %', SQLERRM;
END $$;

-- =============================================================================
-- ROLLBACK (referência):
--   DROP TRIGGER trg_brief_classify ON public.engagement_briefs;
--   DROP FUNCTION public.tg_engagement_brief_classify();
--   DROP FUNCTION public.fn_classify_solution_hint(text[]);
--   DROP TABLE public.engagement_briefs;
--   DROP TYPE public.brief_status;
--   DROP TYPE public.brief_urgency;
--   DROP TYPE public.team_will_operate;
-- =============================================================================
