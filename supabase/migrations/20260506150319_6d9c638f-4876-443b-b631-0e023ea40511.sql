
-- 1. engagement_plans
CREATE TABLE IF NOT EXISTS public.engagement_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  squads_ordered jsonb NOT NULL DEFAULT '[]',
  auto_advance boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','paused')),
  current_squad text,
  completed_squads jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.engagement_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_engagement_plans" ON public.engagement_plans FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_engagement_plans_updated BEFORE UPDATE ON public.engagement_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.engagement_plans REPLICA IDENTITY FULL;

-- 2. squad_checkpoints
CREATE TABLE IF NOT EXISTS public.squad_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.squad_runs(id) ON DELETE CASCADE,
  step_number int NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  context_md text,
  notes text,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.squad_checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_squad_checkpoints" ON public.squad_checkpoints FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.squad_checkpoints REPLICA IDENTITY FULL;

-- 3. workspace_contexts
CREATE TABLE IF NOT EXISTS public.workspace_contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  context_type text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, context_type)
);
ALTER TABLE public.workspace_contexts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_workspace_contexts" ON public.workspace_contexts FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_workspace_contexts_updated BEFORE UPDATE ON public.workspace_contexts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. pipeline_step_outputs
CREATE TABLE IF NOT EXISTS public.pipeline_step_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.squad_runs(id) ON DELETE CASCADE,
  step_number int NOT NULL,
  agent_key text,
  agent_name text,
  output_markdown text,
  tokens_in int DEFAULT 0,
  tokens_out int DEFAULT 0,
  cost_cents int DEFAULT 0,
  duration_ms int,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pipeline_step_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_pipeline_step_outputs" ON public.pipeline_step_outputs FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.pipeline_step_outputs REPLICA IDENTITY FULL;

-- 5. agent_prompts
CREATE TABLE IF NOT EXISTS public.agent_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.squad_runs(id) ON DELETE CASCADE,
  step_number int,
  agent_key text,
  prompt text NOT NULL,
  response text,
  model text,
  tokens_in int DEFAULT 0,
  tokens_out int DEFAULT 0,
  cost_cents int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_agent_prompts" ON public.agent_prompts FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  quiet_hours_start time,
  quiet_hours_end time,
  digest_mode boolean NOT NULL DEFAULT false,
  digest_interval_minutes int NOT NULL DEFAULT 60,
  channels jsonb NOT NULL DEFAULT '{"app": true, "whatsapp": true}',
  categories jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_notification_preferences" ON public.notification_preferences FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_manages_own_notification_preferences" ON public.notification_preferences FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_notification_preferences_updated BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 7. squad_configs.squad_type
ALTER TABLE public.squad_configs ADD COLUMN IF NOT EXISTS squad_type text NOT NULL DEFAULT 'internal';

-- 8. notifications: priority, scheduled_for, category
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS scheduled_for timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS category text;

-- 9. add 'digested' to notification_status enum if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
    BEGIN
      ALTER TYPE public.notification_status ADD VALUE IF NOT EXISTS 'digested';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END$$;

-- 10. realtime publication
DO $$
BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='engagement_plans';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.engagement_plans';
  END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='squad_checkpoints';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_checkpoints';
  END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='pipeline_step_outputs';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_step_outputs';
  END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='squad_runs';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_runs';
  END IF;
END$$;
