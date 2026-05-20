-- =============================================================================
-- Fase 5 OpenSquad — profiles + nps_responses
-- profiles: espelho leve de auth.users (email + nome + avatar) acessível via RLS.
-- nps_responses: respostas de NPS por engagement, alimenta a métrica NPS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text NOT NULL,
  full_name    text,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(lower(email));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode listar profiles do workspace
DROP POLICY IF EXISTS read_profiles ON public.profiles;
CREATE POLICY read_profiles ON public.profiles FOR SELECT
  TO authenticated USING (true);

-- Usuário pode atualizar o próprio profile
DROP POLICY IF EXISTS update_own_profile ON public.profiles;
CREATE POLICY update_own_profile ON public.profiles FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Admin pode tudo
DROP POLICY IF EXISTS admin_all_profiles ON public.profiles;
CREATE POLICY admin_all_profiles ON public.profiles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger: cria profile quando um auth.users é inserido
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();

-- Backfill para usuários já existentes
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT
  u.id,
  u.email,
  NULLIF(u.raw_user_meta_data ->> 'full_name', ''),
  NULLIF(u.raw_user_meta_data ->> 'avatar_url', '')
FROM auth.users u
WHERE u.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- nps_responses
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nps_responses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id   uuid REFERENCES public.engagements(id) ON DELETE SET NULL,
  respondent_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  respondent_email text,
  score           int NOT NULL CHECK (score BETWEEN 0 AND 10),
  comment         text,
  source          text NOT NULL DEFAULT 'webform' CHECK (source IN ('webform','email','whatsapp','manual','api')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nps_engagement ON public.nps_responses(engagement_id);
CREATE INDEX IF NOT EXISTS idx_nps_created ON public.nps_responses(created_at DESC);

ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

-- Autenticado pode inserir suas próprias respostas
DROP POLICY IF EXISTS insert_own_nps ON public.nps_responses;
CREATE POLICY insert_own_nps ON public.nps_responses FOR INSERT
  TO authenticated
  WITH CHECK (respondent_id = auth.uid() OR respondent_id IS NULL);

-- Admin pode tudo
DROP POLICY IF EXISTS admin_all_nps ON public.nps_responses;
CREATE POLICY admin_all_nps ON public.nps_responses FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Autenticado pode ler respostas (para o dashboard de métricas)
DROP POLICY IF EXISTS read_nps ON public.nps_responses;
CREATE POLICY read_nps ON public.nps_responses FOR SELECT
  TO authenticated USING (true);

-- View agregada: NPS mensal (promotores - detratores em pontos percentuais)
CREATE OR REPLACE VIEW public.nps_monthly AS
SELECT
  date_trunc('month', created_at)::date AS month,
  count(*) FILTER (WHERE score >= 9) AS promoters,
  count(*) FILTER (WHERE score BETWEEN 7 AND 8) AS passives,
  count(*) FILTER (WHERE score <= 6) AS detractors,
  count(*) AS total,
  CASE WHEN count(*) > 0
    THEN round(
      (count(*) FILTER (WHERE score >= 9)::numeric / count(*)) * 100
      - (count(*) FILTER (WHERE score <= 6)::numeric / count(*)) * 100
    )
    ELSE 0
  END AS nps_score
FROM public.nps_responses
GROUP BY 1
ORDER BY 1;

GRANT SELECT ON public.nps_monthly TO authenticated;
