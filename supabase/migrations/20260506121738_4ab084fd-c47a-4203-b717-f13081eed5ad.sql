
-- has_role function (text-based to coexist with existing policies)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Ensure unique constraint on user_roles
DO $$ BEGIN
  ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;

-- squad_configs
CREATE TABLE public.squad_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  department text NOT NULL,
  description text,
  default_llm_config text NOT NULL DEFAULT 'default',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.squad_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_squad_configs" ON public.squad_configs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_squad_configs_updated BEFORE UPDATE ON public.squad_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- agent_configs
DO $$ BEGIN
  CREATE TYPE public.agent_role AS ENUM ('lead-analyst','specialist','strategist','reviewer','manager');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.agent_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.squad_configs(id) ON DELETE CASCADE,
  role public.agent_role NOT NULL,
  name text NOT NULL,
  persona text,
  llm_config_key text NOT NULL DEFAULT 'default',
  position_x integer NOT NULL DEFAULT 0,
  position_y integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_configs_squad ON public.agent_configs(squad_id);
ALTER TABLE public.agent_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_agent_configs" ON public.agent_configs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_agent_configs_updated BEFORE UPDATE ON public.agent_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- run_queue
CREATE TABLE public.run_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.squad_runs(id) ON DELETE CASCADE,
  priority integer NOT NULL DEFAULT 100,
  locked_at timestamptz,
  locked_by text,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_run_queue_pickup ON public.run_queue(priority, created_at) WHERE locked_at IS NULL;
ALTER TABLE public.run_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_run_queue" ON public.run_queue
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- run_steps
DO $$ BEGIN
  CREATE TYPE public.run_step_status AS ENUM ('pending','running','completed','failed','skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.run_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.squad_runs(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agent_configs(id) ON DELETE SET NULL,
  step_index integer NOT NULL,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_markdown text,
  tokens_in integer DEFAULT 0,
  tokens_out integer DEFAULT 0,
  cost_cents integer DEFAULT 0,
  latency_ms integer,
  status public.run_step_status NOT NULL DEFAULT 'pending',
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_run_steps_run ON public.run_steps(run_id, step_index);
ALTER TABLE public.run_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_run_steps" ON public.run_steps
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
