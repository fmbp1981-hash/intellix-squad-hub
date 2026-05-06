-- agile_projects
CREATE TABLE public.agile_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  project_type text NOT NULL DEFAULT 'scrum' CHECK (project_type IN ('scrum','kanban','scrumban')),
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','active','on_hold','completed','cancelled')),
  engagement_id uuid REFERENCES public.engagements(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  client_name text,
  product_owner_id uuid,
  ai_scrum_master boolean DEFAULT true,
  sprint_duration_days int NOT NULL DEFAULT 14,
  definition_of_done text DEFAULT '- Critérios de aceite verificados
- Funcionalidade demonstrável ao PO
- Sem impedimentos críticos abertos
- PO notificado (48h para aceite)',
  wip_limit_in_progress int DEFAULT 5,
  wip_limit_review int DEFAULT 3,
  velocity_baseline numeric,
  current_velocity numeric,
  total_story_points int DEFAULT 0,
  completed_points int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agile_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_agile_projects" ON public.agile_projects FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
ALTER TABLE public.agile_projects REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agile_projects;
CREATE TRIGGER agile_projects_updated_at BEFORE UPDATE ON public.agile_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- epics
CREATE TABLE public.epics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.agile_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  business_value text,
  acceptance_criteria text,
  priority int DEFAULT 0,
  moscow text CHECK (moscow IN ('must','should','could','wont')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','cancelled')),
  story_points_estimated int,
  story_points_completed int DEFAULT 0,
  color text DEFAULT '#7c3aed',
  okr_id uuid REFERENCES public.okrs(id) ON DELETE SET NULL,
  squad_run_id uuid REFERENCES public.squad_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.epics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_epics" ON public.epics FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER epics_updated_at BEFORE UPDATE ON public.epics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_epics_project ON public.epics(project_id);

-- user_stories
CREATE TABLE public.user_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id uuid REFERENCES public.epics(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.agile_projects(id) ON DELETE CASCADE,
  persona text NOT NULL,
  action text NOT NULL,
  benefit text NOT NULL,
  description text,
  acceptance_criteria text NOT NULL DEFAULT '',
  story_points int CHECK (story_points IN (1,2,3,5,8,13,21)),
  priority int DEFAULT 0,
  moscow text CHECK (moscow IN ('must','should','could','wont')),
  status text NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog','ready','sprint','in_progress','in_review','done','accepted','cancelled')),
  sprint_id uuid,
  assignee_department text,
  blocked boolean DEFAULT false,
  blocked_reason text,
  tags text[] DEFAULT '{}',
  invest_independent boolean DEFAULT false,
  invest_negotiable boolean DEFAULT false,
  invest_valuable boolean DEFAULT false,
  invest_estimable boolean DEFAULT false,
  invest_small boolean DEFAULT false,
  invest_testable boolean DEFAULT false,
  started_at timestamptz,
  completed_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_user_stories" ON public.user_stories FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
ALTER TABLE public.user_stories REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_stories;
CREATE TRIGGER user_stories_updated_at BEFORE UPDATE ON public.user_stories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_stories_project ON public.user_stories(project_id);
CREATE INDEX idx_stories_sprint ON public.user_stories(sprint_id);
CREATE INDEX idx_stories_epic ON public.user_stories(epic_id);

-- tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.user_stories(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','cancelled')),
  assignee text,
  estimated_hours numeric,
  actual_hours numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_tasks" ON public.tasks FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_tasks_story ON public.tasks(story_id);

-- sprints
CREATE TABLE public.sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.agile_projects(id) ON DELETE CASCADE,
  number int NOT NULL,
  name text,
  goal text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','completed','cancelled')),
  committed_points int DEFAULT 0,
  completed_points int DEFAULT 0,
  added_points int DEFAULT 0,
  removed_points int DEFAULT 0,
  velocity numeric,
  planning_done boolean DEFAULT false,
  review_done boolean DEFAULT false,
  retrospective_done boolean DEFAULT false,
  planning_notes text,
  review_notes text,
  retrospective_notes text,
  retro_actions jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, number)
);
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_sprints" ON public.sprints FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
ALTER TABLE public.sprints REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sprints;
CREATE TRIGGER sprints_updated_at BEFORE UPDATE ON public.sprints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- FK retroativa
ALTER TABLE public.user_stories ADD CONSTRAINT fk_story_sprint FOREIGN KEY (sprint_id) REFERENCES public.sprints(id) ON DELETE SET NULL;

-- sprint_metrics
CREATE TABLE public.sprint_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.agile_projects(id) ON DELETE CASCADE,
  recorded_date date NOT NULL,
  remaining_points int NOT NULL,
  ideal_remaining int NOT NULL,
  completed_points int NOT NULL,
  total_scope int NOT NULL,
  wip_count int DEFAULT 0,
  avg_cycle_time_days numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sprint_id, recorded_date)
);
ALTER TABLE public.sprint_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_sprint_metrics" ON public.sprint_metrics FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- impediments
CREATE TABLE public.impediments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.agile_projects(id) ON DELETE CASCADE,
  sprint_id uuid REFERENCES public.sprints(id) ON DELETE SET NULL,
  story_id uuid REFERENCES public.user_stories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  impact text NOT NULL CHECK (impact IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','accepted')),
  resolution text,
  ai_suggested_resolution text,
  reported_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.impediments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_impediments" ON public.impediments FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
ALTER TABLE public.impediments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.impediments;

-- velocity_history
CREATE TABLE public.velocity_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.agile_projects(id) ON DELETE CASCADE,
  sprint_id uuid NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  sprint_number int NOT NULL,
  velocity numeric NOT NULL,
  committed int NOT NULL,
  completed int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, sprint_id)
);
ALTER TABLE public.velocity_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_velocity_history" ON public.velocity_history FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- release_plans
CREATE TABLE public.release_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.agile_projects(id) ON DELETE CASCADE,
  version text NOT NULL,
  target_date date,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','released','cancelled')),
  description text,
  release_notes text,
  total_points int DEFAULT 0,
  epics_included uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.release_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_release_plans" ON public.release_plans FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- cron diário (02h UTC = 23h Recife)
SELECT cron.schedule(
  'intellix-agile-metrics',
  '0 2 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/agile-metrics-record',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || coalesce(current_setting('app.internal_secret', true), '')
    ),
    body := '{}'::jsonb
  )$$
);