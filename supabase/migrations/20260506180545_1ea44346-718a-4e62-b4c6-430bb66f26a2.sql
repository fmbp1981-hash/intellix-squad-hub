
ALTER TABLE public.agile_projects
  ADD COLUMN IF NOT EXISTS deal_id uuid,
  ADD COLUMN IF NOT EXISTS contract_id uuid,
  ADD COLUMN IF NOT EXISTS auto_planning_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS auto_planning_job_id uuid,
  ADD COLUMN IF NOT EXISTS execution_plan_md text,
  ADD COLUMN IF NOT EXISTS auto_planning_error text,
  ADD COLUMN IF NOT EXISTS auto_planning_completed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agile_projects_deal_id ON public.agile_projects(deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agile_projects_contract_id ON public.agile_projects(contract_id);
CREATE INDEX IF NOT EXISTS idx_agile_projects_engagement_id ON public.agile_projects(engagement_id);

INSERT INTO public.agile_projects (name, client_name, description, deal_id, status, project_type, auto_planning_status)
SELECT d.company_name, d.company_name, d.scope_summary, d.id, 'planning', 'scrum', 'pending'
FROM public.deals d
WHERE d.status = 'won'
  AND NOT EXISTS (SELECT 1 FROM public.agile_projects p WHERE p.deal_id = d.id);
