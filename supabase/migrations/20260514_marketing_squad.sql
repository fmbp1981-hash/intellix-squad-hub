-- ============================================================
-- MARKETING SQUAD — Tabelas, seed e cron
-- ============================================================

-- 1. Novos valores de enum (PostgreSQL 15 — seguro em transação)
ALTER TYPE public.agent_role ADD VALUE IF NOT EXISTS 'content-curator';
ALTER TYPE public.agent_role ADD VALUE IF NOT EXISTS 'intelligence-analyst';

-- ============================================================
-- TABELAS
-- ============================================================

-- 2. Contexto estratégico do @ai_intellix
CREATE TABLE IF NOT EXISTS public.strategy_context (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text UNIQUE NOT NULL,
  value       jsonb NOT NULL,
  description text,
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE public.strategy_context ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sc_auth_read"  ON public.strategy_context FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "sc_admin_write" ON public.strategy_context FOR ALL   USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.strategy_context (key, value, description) VALUES (
  'intellix_instagram_strategy',
  '{
    "profile": "@ai_intellix",
    "positioning": "Tecnologia Invisivel. Resultado Visivel.",
    "audience": "CEOs e lideres de PMEs no Brasil e America Latina",
    "tone": "estrategico, calmo, confiante",
    "cadence": {
      "frequency": "3x/semana",
      "monday":    {"format": "Estatico",          "pillar": "P1"},
      "wednesday": {"format": "Carrossel",          "pillar": "P2 ou P3"},
      "friday":    {"format": "Reel ou Carrossel",  "pillar": "P3 ou P5"}
    },
    "pillars": [
      {"id":"P1","name":"Verdade Incomoda",    "format":"Estatico",          "goal":"curtidas + compartilhamentos"},
      {"id":"P2","name":"Educacao Executiva",  "format":"Carrossel 7 slides","goal":"salvamentos"},
      {"id":"P3","name":"IA News da Semana",   "format":"Carrossel",         "goal":"fidelizacao"},
      {"id":"P4","name":"Bastidores",          "format":"Stories/Reel mensal","goal":"conexao"},
      {"id":"P5","name":"Provocacao",          "format":"Reel",              "goal":"comentarios + alcance"}
    ],
    "visual": {
      "bg":           "#0D2B45",
      "accent":       "#F5C434",
      "primary":      "#269BEA",
      "white":        "#FFFFFF",
      "font_heading": "DM Sans Bold",
      "font_body":    "Inter Regular"
    },
    "forbidden_terms": ["API","workflow","chatbot","automacao","GPT","LLM","n8n","Make","Supabase","pipeline","stack","deploy"],
    "validated_hooks": [
      "A maioria das empresas nao tem problema de tecnologia. Tem problema de processo.",
      "Sua empresa esta pagando caro para fazer o que a IA faz sozinha.",
      "A IA nao vai substituir seus funcionarios. Vai substituir sua concorrencia.",
      "Mais importante do que qual IA usar e saber qual problema voce precisa resolver."
    ]
  }',
  'Estrategia completa do @ai_intellix'
) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- 3. Pesquisa bruta do Lúcio
CREATE TABLE IF NOT EXISTS public.trends_raw (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id         uuid NOT NULL DEFAULT gen_random_uuid(),
  collected_at     timestamptz DEFAULT now(),
  source           text CHECK (source IN ('brave_search','google_news','gmail','jina_fetch')),
  title            text,
  url              text,
  content_snippet  text,
  published_at     timestamptz,
  raw_metadata     jsonb
);
ALTER TABLE public.trends_raw ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tr_auth_all" ON public.trends_raw FOR ALL USING (auth.role() = 'authenticated');

-- 4. Curadoria da Iris
CREATE TABLE IF NOT EXISTS public.trends_curated (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trends_raw_id         uuid REFERENCES public.trends_raw(id) ON DELETE SET NULL,
  batch_id              uuid,
  titulo_original       text NOT NULL,
  url                   text,
  fonte                 text,
  relevancia_score      int CHECK (relevancia_score BETWEEN 1 AND 10),
  categoria             text CHECK (categoria IN ('eficiencia_operacional','decisao_dados','atendimento','vendas','gestao_pessoas','outros')),
  angulo_editorial      text,
  potencial_engajamento text CHECK (potencial_engajamento IN ('salvamento','compartilhamento','comentario','viral')),
  formato_sugerido      text CHECK (formato_sugerido IN ('carrossel','estatico','reel','news_semanal')),
  is_top_5_semana       bool DEFAULT false,
  is_viral_candidate    bool DEFAULT false,
  used_in_post          bool DEFAULT false,
  curated_at            timestamptz DEFAULT now()
);
ALTER TABLE public.trends_curated ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tc_auth_all" ON public.trends_curated FOR ALL USING (auth.role() = 'authenticated');

-- 5. Calendário editorial (output da Maya)
CREATE TABLE IF NOT EXISTS public.content_calendar (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start           date NOT NULL,
  scheduled_for        timestamptz NOT NULL,
  pillar               text CHECK (pillar IN ('P1','P2','P3','P4','P5')),
  format               text CHECK (format IN ('reel','carrossel','estatico','story','live')),
  theme                text NOT NULL,
  hook_suggestion      text,
  trends_curated_ids   jsonb DEFAULT '[]',
  status               text CHECK (status IN ('draft','approved','rejected')) DEFAULT 'draft',
  approved_by          uuid REFERENCES auth.users(id),
  approved_at          timestamptz,
  notes                text,
  created_at           timestamptz DEFAULT now()
);
ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_auth_all" ON public.content_calendar FOR ALL USING (auth.role() = 'authenticated');

-- 6. Rascunhos de copy (output do Téo)
CREATE TABLE IF NOT EXISTS public.content_drafts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id           uuid REFERENCES public.content_calendar(id) ON DELETE CASCADE,
  hook                  text NOT NULL,
  caption               text NOT NULL,
  cta                   text,
  hashtags              text[],
  slide_structure       jsonb,
  word_count            int,
  forbidden_terms_found text[],
  status                text CHECK (status IN ('draft','review','approved','rejected')) DEFAULT 'draft',
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);
ALTER TABLE public.content_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cd_auth_all" ON public.content_drafts FOR ALL USING (auth.role() = 'authenticated');

-- 7. Perfis de concorrentes (Otto)
CREATE TABLE IF NOT EXISTS public.competitor_profiles (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle_or_url             text NOT NULL,
  platform                  text CHECK (platform IN ('instagram','website','blog','linkedin')),
  analyzed_at               timestamptz DEFAULT now(),
  posts_analyzed            int,
  avg_engagement_rate       numeric(5,2),
  dominant_format           text,
  posting_frequency         text,
  editorial_insights        text,
  recommended_adaptations   jsonb,
  raw_data                  jsonb
);
ALTER TABLE public.competitor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp_auth_all" ON public.competitor_profiles FOR ALL USING (auth.role() = 'authenticated');

-- 8. Design DNA extraído pelo Otto (referenciado por visual_briefs — criar antes)
CREATE TABLE IF NOT EXISTS public.design_dna_extracted (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_profile_id    uuid REFERENCES public.competitor_profiles(id) ON DELETE CASCADE,
  brand_primary            text,
  brand_light              text,
  brand_dark               text,
  heading_font             text,
  body_font                text,
  layout_style             text,
  text_density             text,
  uses_face                bool,
  uses_illustrations       bool,
  uses_photography         bool,
  cta_slide_style          text,
  hook_patterns            jsonb,
  copy_framework           text,
  avg_words_per_slide      int,
  emoji_usage              text,
  hashtag_count            int,
  confidence_score         numeric(3,2),
  notes                    text,
  created_at               timestamptz DEFAULT now()
);
ALTER TABLE public.design_dna_extracted ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dna_auth_all" ON public.design_dna_extracted FOR ALL USING (auth.role() = 'authenticated');

-- 9. Briefing visual (output da Vera) — após design_dna_extracted
CREATE TABLE IF NOT EXISTS public.visual_briefs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id             uuid REFERENCES public.content_drafts(id) ON DELETE CASCADE,
  bg_color             text DEFAULT '#0D2B45',
  accent_color         text DEFAULT '#F5C434',
  primary_color        text DEFAULT '#269BEA',
  font_heading         text DEFAULT 'DM Sans Bold',
  font_body            text DEFAULT 'Inter Regular',
  slide_specs          jsonb,
  canva_master_prompt  text,
  uses_face            bool DEFAULT false,
  cover_style          text,
  competitor_dna_id    uuid REFERENCES public.design_dna_extracted(id),
  created_at           timestamptz DEFAULT now()
);
ALTER TABLE public.visual_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vb_auth_all" ON public.visual_briefs FOR ALL USING (auth.role() = 'authenticated');

-- 10. Revisão da Sofia
CREATE TABLE IF NOT EXISTS public.review_results (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id     uuid REFERENCES public.content_drafts(id) ON DELETE CASCADE,
  status       text CHECK (status IN ('approved','rejected','revision_needed')) NOT NULL,
  checklist    jsonb,
  issues_found text[],
  suggestions  text,
  reviewed_at  timestamptz DEFAULT now()
);
ALTER TABLE public.review_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rr_auth_all" ON public.review_results FOR ALL USING (auth.role() = 'authenticated');

-- 11. Posts publicados
CREATE TABLE IF NOT EXISTS public.published_posts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id             uuid REFERENCES public.content_drafts(id),
  calendar_id          uuid REFERENCES public.content_calendar(id),
  instagram_url        text,
  published_at         timestamptz NOT NULL DEFAULT now(),
  reach                int,
  impressions          int,
  likes                int,
  comments             int,
  saves                int,
  shares               int,
  reel_views           int,
  metrics_collected_at timestamptz,
  notes                text
);
ALTER TABLE public.published_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pp_auth_all" ON public.published_posts FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_trends_raw_batch       ON public.trends_raw(batch_id);
CREATE INDEX IF NOT EXISTS idx_trends_curated_batch   ON public.trends_curated(batch_id);
CREATE INDEX IF NOT EXISTS idx_trends_curated_top5    ON public.trends_curated(is_top_5_semana) WHERE is_top_5_semana = true;
CREATE INDEX IF NOT EXISTS idx_content_calendar_week  ON public.content_calendar(week_start);
CREATE INDEX IF NOT EXISTS idx_content_drafts_cal     ON public.content_drafts(calendar_id);
CREATE INDEX IF NOT EXISTS idx_content_drafts_status  ON public.content_drafts(status);

-- ============================================================
-- SEED: Marketing Squad + 7 agentes
-- ============================================================
INSERT INTO public.squad_configs (key, name, department, description, active)
VALUES ('internal-marketing', 'Marketing Squad', 'Marketing',
        'Squad interno de producao de conteudo para @ai_intellix no Instagram', true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.agent_configs (name, role, squad_id, llm_config_key, show_in_office)
SELECT
  a.name,
  a.role::public.agent_role,
  (SELECT id FROM public.squad_configs WHERE key = 'internal-marketing'),
  a.llm_key,
  a.show_in_office
FROM (VALUES
  ('Lúcio',  'lead-analyst',         'google:gemini-2-0-flash',        false),
  ('Iris',   'content-curator',      'anthropic:claude-haiku-4-5',     false),
  ('Maya',   'manager',              'anthropic:claude-sonnet-4-6',    true),
  ('Téo',    'specialist',           'anthropic:claude-sonnet-4-6',    true),
  ('Vera',   'specialist',           'anthropic:claude-sonnet-4-6',    true),
  ('Sofia',  'reviewer',             'anthropic:claude-opus-4-6',      true),
  ('Otto',   'intelligence-analyst', 'anthropic:claude-sonnet-4-6',    false)
) AS a(name, role, llm_key, show_in_office)
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_configs ac
  WHERE ac.name = a.name
    AND ac.squad_id = (SELECT id FROM public.squad_configs WHERE key = 'internal-marketing')
);

-- ============================================================
-- CRON: pesquisa toda segunda-feira às 09:00 BRT (12:00 UTC)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'marketing-weekly-research',
      '0 12 * * 1',
      $$
        SELECT net.http_post(
          url     := current_setting('app.supabase_url') || '/functions/v1/marketing-weekly-trigger',
          headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
        )
      $$
    );
  END IF;
END $$;
