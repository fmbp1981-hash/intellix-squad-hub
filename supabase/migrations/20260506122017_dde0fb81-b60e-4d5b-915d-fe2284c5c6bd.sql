
-- internal_jobs
DO $$ BEGIN
  CREATE TYPE public.internal_job_kind AS ENUM ('daily-standup','weekly-review','on-demand-brief','incident-response');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.internal_job_status AS ENUM ('pending','running','completed','failed','aborted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.internal_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.internal_job_kind NOT NULL,
  department text,
  status public.internal_job_status NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_markdown text,
  created_by uuid,
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_internal_jobs_status ON public.internal_jobs(status, scheduled_for);
ALTER TABLE public.internal_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_internal_jobs" ON public.internal_jobs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_internal_jobs_updated BEFORE UPDATE ON public.internal_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- briefings
CREATE TABLE public.briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  source text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_briefings_workspace ON public.briefings(workspace_id);
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_briefings" ON public.briefings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- directives
CREATE TABLE public.directives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_key text,
  department text,
  title text NOT NULL,
  body text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  issued_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_directives_squad ON public.directives(squad_key) WHERE active;
ALTER TABLE public.directives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_directives" ON public.directives
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_directives_updated BEFORE UPDATE ON public.directives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- okrs
CREATE TABLE public.okrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter text NOT NULL,
  department text NOT NULL,
  objective text NOT NULL,
  key_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  progress numeric NOT NULL DEFAULT 0,
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.okrs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_okrs" ON public.okrs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_okrs_updated BEFORE UPDATE ON public.okrs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
