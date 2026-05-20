-- =============================================================================
-- ESP modular — Engagement Solution Package
-- Spec: OpenSquad_Workflow_E2E_PreDev_v2.md (seção 2)
-- Substitui o modelo PRD-único pelo ESP com 5 módulos (A, B, C, D, E).
-- Cada engagement passa a ter 1 esp_package, ativando módulos por tipo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.engagement_type AS ENUM
    ('consulting','agent','automation','product','hybrid','undetermined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.esp_status AS ENUM
    ('drafting','review','approved','delivered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.esp_module_status AS ENUM
    ('not_started','drafting','review','approved','needs_revision');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.esp_module_code AS ENUM ('A','B','C','D','E');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- esp_packages — núcleo do ESP (1 por engagement)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.esp_packages (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id         uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  type                  public.engagement_type NOT NULL DEFAULT 'undetermined',
  classified_by_agent   text,
  classified_at         timestamptz,
  validated_by_agent    text,
  validated_at          timestamptz,
  diagnosis_md          text,
  kpis                  jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_register         jsonb NOT NULL DEFAULT '[]'::jsonb,
  timeline_macro        jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_dod            jsonb NOT NULL DEFAULT '{}'::jsonb,
  status                public.esp_status NOT NULL DEFAULT 'drafting',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engagement_id)
);

CREATE INDEX IF NOT EXISTS idx_esp_packages_engagement ON public.esp_packages(engagement_id);
CREATE INDEX IF NOT EXISTS idx_esp_packages_status ON public.esp_packages(status);

ALTER TABLE public.esp_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esp_packages REPLICA IDENTITY FULL;

DO $$ BEGIN
  CREATE POLICY "admin_all_esp_packages" ON public.esp_packages FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TRIGGER trg_esp_packages_updated BEFORE UPDATE ON public.esp_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- esp_modules — módulos ativos do ESP (1-N com esp_packages)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.esp_modules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  esp_package_id      uuid NOT NULL REFERENCES public.esp_packages(id) ON DELETE CASCADE,
  module_code         public.esp_module_code NOT NULL,
  required            boolean NOT NULL DEFAULT true,
  status              public.esp_module_status NOT NULL DEFAULT 'not_started',
  artifact_url        text,
  content_md          text,
  produced_by_agent   text,
  approved_by_agent   text,
  approved_at         timestamptz,
  review_feedback     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (esp_package_id, module_code)
);

CREATE INDEX IF NOT EXISTS idx_esp_modules_package ON public.esp_modules(esp_package_id);
CREATE INDEX IF NOT EXISTS idx_esp_modules_status ON public.esp_modules(status);

ALTER TABLE public.esp_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esp_modules REPLICA IDENTITY FULL;

DO $$ BEGIN
  CREATE POLICY "admin_all_esp_modules" ON public.esp_modules FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TRIGGER trg_esp_modules_updated BEFORE UPDATE ON public.esp_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- Trigger: criar esp_package automaticamente para todo engagement novo
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_create_esp_package_on_engagement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.esp_packages (engagement_id, type, status)
  VALUES (NEW.id, 'undetermined', 'drafting')
  ON CONFLICT (engagement_id) DO NOTHING;

  -- Módulo E (Executive brief + Roadmap) é sempre obrigatório
  INSERT INTO public.esp_modules (esp_package_id, module_code, required, status)
  SELECT id, 'E', true, 'not_started'
  FROM public.esp_packages WHERE engagement_id = NEW.id
  ON CONFLICT (esp_package_id, module_code) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_engagement_create_esp ON public.engagements;
CREATE TRIGGER trg_engagement_create_esp
  AFTER INSERT ON public.engagements
  FOR EACH ROW EXECUTE FUNCTION public.tg_create_esp_package_on_engagement();

-- -----------------------------------------------------------------------------
-- Helper: ativar módulos por tipo (chamado quando Ana classifica)
-- Matriz da spec seção 2.4:
--   consulting → A + E
--   agent      → B + C + E (A, D opcionais)
--   automation → C + E (B opcional)
--   product    → D + E (A opcional)
--   hybrid     → A + E (resto opcional)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_activate_esp_modules(
  p_esp_package_id uuid,
  p_type public.engagement_type
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  required_modules public.esp_module_code[];
  optional_modules public.esp_module_code[];
  m public.esp_module_code;
BEGIN
  CASE p_type
    WHEN 'consulting' THEN
      required_modules := ARRAY['A','E']::public.esp_module_code[];
      optional_modules := ARRAY['C']::public.esp_module_code[];
    WHEN 'agent' THEN
      required_modules := ARRAY['B','C','E']::public.esp_module_code[];
      optional_modules := ARRAY['A','D']::public.esp_module_code[];
    WHEN 'automation' THEN
      required_modules := ARRAY['C','E']::public.esp_module_code[];
      optional_modules := ARRAY['B']::public.esp_module_code[];
    WHEN 'product' THEN
      required_modules := ARRAY['D','E']::public.esp_module_code[];
      optional_modules := ARRAY['A']::public.esp_module_code[];
    WHEN 'hybrid' THEN
      required_modules := ARRAY['A','E']::public.esp_module_code[];
      optional_modules := ARRAY['B','C','D']::public.esp_module_code[];
    ELSE
      required_modules := ARRAY['E']::public.esp_module_code[];
      optional_modules := ARRAY[]::public.esp_module_code[];
  END CASE;

  FOREACH m IN ARRAY required_modules LOOP
    INSERT INTO public.esp_modules (esp_package_id, module_code, required, status)
    VALUES (p_esp_package_id, m, true, 'not_started')
    ON CONFLICT (esp_package_id, module_code)
    DO UPDATE SET required = true;
  END LOOP;

  FOREACH m IN ARRAY optional_modules LOOP
    INSERT INTO public.esp_modules (esp_package_id, module_code, required, status)
    VALUES (p_esp_package_id, m, false, 'not_started')
    ON CONFLICT (esp_package_id, module_code) DO NOTHING;
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- Backfill: criar esp_package para engagements existentes
-- -----------------------------------------------------------------------------
INSERT INTO public.esp_packages (engagement_id, type, status)
SELECT e.id, 'undetermined', 'drafting'
FROM public.engagements e
LEFT JOIN public.esp_packages ep ON ep.engagement_id = e.id
WHERE ep.id IS NULL
ON CONFLICT (engagement_id) DO NOTHING;

-- Módulo E para todos os pacotes recém-criados
INSERT INTO public.esp_modules (esp_package_id, module_code, required, status)
SELECT ep.id, 'E', true, 'not_started'
FROM public.esp_packages ep
LEFT JOIN public.esp_modules em
  ON em.esp_package_id = ep.id AND em.module_code = 'E'
WHERE em.id IS NULL
ON CONFLICT (esp_package_id, module_code) DO NOTHING;

-- =============================================================================
-- ROLLBACK (referência, não executa):
--   DROP TRIGGER trg_engagement_create_esp ON public.engagements;
--   DROP FUNCTION public.tg_create_esp_package_on_engagement();
--   DROP FUNCTION public.fn_activate_esp_modules(uuid, public.engagement_type);
--   DROP TABLE public.esp_modules;
--   DROP TABLE public.esp_packages;
--   DROP TYPE public.esp_module_code;
--   DROP TYPE public.esp_module_status;
--   DROP TYPE public.esp_status;
--   DROP TYPE public.engagement_type;
-- =============================================================================
