-- =============================================================================
-- routing_rules — roteamento engagement → squad/agentes
-- Spec: OpenSquad_Workflow_E2E_PreDev_v2.md (seção 4 — Roteamento)
-- Avaliação: priority DESC, primeira regra ativa cuja condition matcha vence.
-- Conditions são jsonb declarativas; matching feito por fn_routing_rule_matches.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabela principal
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.routing_rules (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     text NOT NULL,
  description              text,
  priority                 integer NOT NULL DEFAULT 100,
  active                   boolean NOT NULL DEFAULT true,

  -- Condição declarativa, ex.:
  --   {"solution_type": ["agent","automation"],
  --    "expectation_any": ["agent","automation"],
  --    "budget_min_brl": 50000,
  --    "budget_max_brl": 200000,
  --    "urgency_in": ["lt_1m","1_3m"],
  --    "stack_any": ["whatsapp","evolution","n8n"],
  --    "team_will_operate_in": ["yes","with_support"]}
  conditions               jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Alvo: squad recomendado e/ou subset de agentes (por nome)
  target_squad_id          uuid,  -- soft FK; squad_configs pode não existir ainda
  target_agent_names       text[] NOT NULL DEFAULT '{}',

  -- Mensagem que vai pro Felipe junto da recomendação
  rationale                text,

  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routing_rules_active_priority
  ON public.routing_rules(active, priority DESC);

ALTER TABLE public.routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_rules REPLICA IDENTITY FULL;

DO $$ BEGIN
  CREATE POLICY "admin_all_routing_rules" ON public.routing_rules FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TRIGGER trg_routing_rules_updated BEFORE UPDATE ON public.routing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- engagements: campos derivados para routing (preenchidos pelo trigger abaixo)
-- -----------------------------------------------------------------------------
ALTER TABLE public.engagements
  ADD COLUMN IF NOT EXISTS budget_brl_estimate  numeric,
  ADD COLUMN IF NOT EXISTS routed_squad_id      uuid,
  ADD COLUMN IF NOT EXISTS routed_agent_names   text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS routed_rule_id       uuid REFERENCES public.routing_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS routed_at            timestamptz;

-- -----------------------------------------------------------------------------
-- fn_routing_rule_matches — avalia uma regra contra um snapshot de contexto
-- Snapshot mínimo (jsonb):
--   { solution_type, expectation_categories[], budget_brl, urgency,
--     current_stack, team_will_operate }
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_routing_rule_matches(
  p_conditions jsonb,
  p_ctx        jsonb
) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  arr_text text[];
  v_num    numeric;
  v_text   text;
  stack    text;
  kw       text;
BEGIN
  -- solution_type ∈ conditions.solution_type[]
  IF p_conditions ? 'solution_type' THEN
    SELECT array_agg(value::text) INTO arr_text
      FROM jsonb_array_elements_text(p_conditions->'solution_type') AS t(value);
    IF NOT ((p_ctx->>'solution_type') = ANY(arr_text)) THEN RETURN false; END IF;
  END IF;

  -- expectation_categories ∩ conditions.expectation_any ≠ ∅
  IF p_conditions ? 'expectation_any' THEN
    SELECT array_agg(value::text) INTO arr_text
      FROM jsonb_array_elements_text(p_conditions->'expectation_any') AS t(value);
    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(COALESCE(p_ctx->'expectation_categories','[]'::jsonb)) AS e(val)
      WHERE e.val = ANY(arr_text)
    ) THEN RETURN false; END IF;
  END IF;

  -- budget_min_brl ≤ ctx.budget_brl
  IF p_conditions ? 'budget_min_brl' THEN
    v_num := (p_conditions->>'budget_min_brl')::numeric;
    IF (p_ctx->>'budget_brl') IS NULL OR (p_ctx->>'budget_brl')::numeric < v_num
      THEN RETURN false; END IF;
  END IF;

  -- budget_max_brl ≥ ctx.budget_brl
  IF p_conditions ? 'budget_max_brl' THEN
    v_num := (p_conditions->>'budget_max_brl')::numeric;
    IF (p_ctx->>'budget_brl') IS NULL OR (p_ctx->>'budget_brl')::numeric > v_num
      THEN RETURN false; END IF;
  END IF;

  -- urgency ∈ conditions.urgency_in[]
  IF p_conditions ? 'urgency_in' THEN
    SELECT array_agg(value::text) INTO arr_text
      FROM jsonb_array_elements_text(p_conditions->'urgency_in') AS t(value);
    IF NOT ((p_ctx->>'urgency') = ANY(arr_text)) THEN RETURN false; END IF;
  END IF;

  -- team_will_operate ∈ conditions.team_will_operate_in[]
  IF p_conditions ? 'team_will_operate_in' THEN
    SELECT array_agg(value::text) INTO arr_text
      FROM jsonb_array_elements_text(p_conditions->'team_will_operate_in') AS t(value);
    IF NOT ((p_ctx->>'team_will_operate') = ANY(arr_text)) THEN RETURN false; END IF;
  END IF;

  -- stack_any: alguma keyword aparece em current_stack (case-insensitive)
  IF p_conditions ? 'stack_any' THEN
    stack := lower(COALESCE(p_ctx->>'current_stack',''));
    IF stack = '' THEN RETURN false; END IF;
    FOR kw IN SELECT lower(value::text)
              FROM jsonb_array_elements_text(p_conditions->'stack_any') AS t(value)
    LOOP
      IF stack LIKE '%' || kw || '%' THEN RETURN true; END IF;
    END LOOP;
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- -----------------------------------------------------------------------------
-- fn_build_routing_context — monta snapshot a partir do engagement
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_build_routing_context(
  p_engagement_id uuid
) RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_solution_type text;
  v_categories    jsonb := '[]'::jsonb;
  v_budget        numeric;
  v_urgency       text;
  v_stack         text;
  v_team          text;
BEGIN
  SELECT ep.type::text INTO v_solution_type
    FROM public.esp_packages ep WHERE ep.engagement_id = p_engagement_id;

  -- Pega o brief mais recente vinculado ao mesmo lead do engagement
  SELECT
    to_jsonb(eb.expectation_categories),
    eb.urgency::text,
    eb.current_stack,
    eb.team_will_operate::text
  INTO v_categories, v_urgency, v_stack, v_team
  FROM public.engagements e
  JOIN public.engagement_briefs eb ON eb.lead_id = e.lead_id
  WHERE e.id = p_engagement_id
  ORDER BY eb.created_at DESC
  LIMIT 1;

  SELECT e.budget_brl_estimate INTO v_budget
    FROM public.engagements e WHERE e.id = p_engagement_id;

  RETURN jsonb_build_object(
    'solution_type',          COALESCE(v_solution_type,'undetermined'),
    'expectation_categories', COALESCE(v_categories,'[]'::jsonb),
    'budget_brl',             v_budget,
    'urgency',                COALESCE(v_urgency,'none'),
    'current_stack',          COALESCE(v_stack,''),
    'team_will_operate',      v_team
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- fn_route_engagement — roda routing e persiste em engagements
-- Retorna o id da regra que matchou (ou NULL).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_route_engagement(
  p_engagement_id uuid
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  v_ctx       jsonb;
  v_rule      public.routing_rules%ROWTYPE;
BEGIN
  v_ctx := public.fn_build_routing_context(p_engagement_id);

  FOR v_rule IN
    SELECT * FROM public.routing_rules
    WHERE active = true
    ORDER BY priority DESC, created_at ASC
  LOOP
    IF public.fn_routing_rule_matches(v_rule.conditions, v_ctx) THEN
      UPDATE public.engagements SET
        routed_squad_id    = v_rule.target_squad_id,
        routed_agent_names = v_rule.target_agent_names,
        routed_rule_id     = v_rule.id,
        routed_at          = now()
      WHERE id = p_engagement_id;
      RETURN v_rule.id;
    END IF;
  END LOOP;

  -- Sem match: limpa rota anterior
  UPDATE public.engagements SET
    routed_squad_id = NULL, routed_agent_names = '{}'::text[],
    routed_rule_id = NULL, routed_at = now()
  WHERE id = p_engagement_id;
  RETURN NULL;
END;
$$;

-- -----------------------------------------------------------------------------
-- Seeds — regras default da spec (matriz seção 4)
-- Prioridades: específicas > genéricas. WhatsApp/Evolution = sinal forte.
-- -----------------------------------------------------------------------------
INSERT INTO public.routing_rules (name, description, priority, conditions, target_agent_names, rationale)
VALUES
  ('whatsapp_agent_operacional',
   'Cliente quer agente IA + opera WhatsApp (Evolution/n8n)',
   500,
   '{"solution_type":["agent","hybrid"],"stack_any":["whatsapp","evolution","z-api","n8n"]}'::jsonb,
   ARRAY['Bruno','Carlos','Ana']::text[],
   'Stack WhatsApp + agente IA → squad operacional liderado por Bruno (agentes) com Carlos (automação) e Ana (estratégia).'),

  ('agent_default',
   'Engajamento classificado como agent (sem sinais específicos de stack)',
   300,
   '{"solution_type":["agent"]}'::jsonb,
   ARRAY['Bruno','Ana']::text[],
   'ESP type=agent → Bruno é o owner; Ana valida ESP módulo A.'),

  ('automation_default',
   'Engajamento de automação pura',
   300,
   '{"solution_type":["automation"]}'::jsonb,
   ARRAY['Carlos','Beatriz']::text[],
   'ESP type=automation → Carlos lidera; Beatriz cobre ops de integração.'),

  ('product_default',
   'Engajamento de produto/SaaS',
   300,
   '{"solution_type":["product"]}'::jsonb,
   ARRAY['Roberto','Daniel']::text[],
   'ESP type=product → Roberto (PM) + Daniel (eng).'),

  ('consulting_default',
   'Consultoria estratégica',
   300,
   '{"solution_type":["consulting"]}'::jsonb,
   ARRAY['Ana','Diana']::text[],
   'ESP type=consulting → Ana lidera diagnóstico, Diana entrega artefatos.'),

  ('hybrid_default',
   'Híbrido — múltiplos módulos ESP',
   300,
   '{"solution_type":["hybrid"]}'::jsonb,
   ARRAY['Ana','Bruno','Carlos','Roberto']::text[],
   'ESP type=hybrid → squad ampliado coordenado por Ana.'),

  ('high_budget_premium',
   'Budget > R$200k → squad premium com Felipe próximo',
   400,
   '{"budget_min_brl":200000}'::jsonb,
   ARRAY['Ana','Felipe']::text[],
   'Budget alto → Felipe entra em pairing direto com Ana para reduzir risco de execução.'),

  ('urgent_lt_1m',
   'Urgência < 1 mês → squad enxuto e WIP=1',
   450,
   '{"urgency_in":["lt_1m"]}'::jsonb,
   ARRAY['Ana','Bruno']::text[],
   'Prazo agressivo (<1 mês) → squad mínimo com WIP=1 para não fragmentar foco.'),

  ('undetermined_triage',
   'Sem classificação ainda → triagem com Ana',
   100,
   '{"solution_type":["undetermined"]}'::jsonb,
   ARRAY['Ana']::text[],
   'ESP indefinido → Ana entra em modo triage para classificar e ativar módulos.'),

  ('fallback_any',
   'Fallback genérico — não bater regras anteriores',
   1,
   '{}'::jsonb,
   ARRAY['Ana']::text[],
   'Fallback: Ana recebe qualquer engagement não roteado.')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- ROLLBACK (referência):
--   ALTER TABLE public.engagements
--     DROP COLUMN routed_at, DROP COLUMN routed_rule_id,
--     DROP COLUMN routed_agent_names, DROP COLUMN routed_squad_id,
--     DROP COLUMN budget_brl_estimate;
--   DROP FUNCTION public.fn_route_engagement(uuid);
--   DROP FUNCTION public.fn_build_routing_context(uuid);
--   DROP FUNCTION public.fn_routing_rule_matches(jsonb, jsonb);
--   DROP TABLE public.routing_rules;
-- =============================================================================
