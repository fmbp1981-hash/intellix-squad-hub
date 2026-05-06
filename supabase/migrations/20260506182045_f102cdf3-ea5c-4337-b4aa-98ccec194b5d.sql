
-- deal AI insights
CREATE TABLE public.deal_ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  win_probability numeric,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  draft_email text,
  summary text,
  model text,
  created_by uuid
);
CREATE INDEX idx_deal_ai_insights_deal ON public.deal_ai_insights(deal_id, generated_at DESC);
ALTER TABLE public.deal_ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all_deal_ai_insights ON public.deal_ai_insights FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
ALTER TABLE public.deal_ai_insights REPLICA IDENTITY FULL;

-- sprint AI alerts
CREATE TABLE public.sprint_ai_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid NOT NULL,
  project_id uuid NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  type text NOT NULL,
  message text NOT NULL,
  suggested_action text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sprint_ai_alerts_sprint ON public.sprint_ai_alerts(sprint_id, created_at DESC);
ALTER TABLE public.sprint_ai_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all_sprint_ai_alerts ON public.sprint_ai_alerts FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
ALTER TABLE public.sprint_ai_alerts REPLICA IDENTITY FULL;

-- crm activities timeline
CREATE TABLE public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  subject text NOT NULL,
  body text,
  lead_id uuid,
  deal_id uuid,
  contract_id uuid,
  owner_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_activities_lead ON public.crm_activities(lead_id, occurred_at DESC);
CREATE INDEX idx_crm_activities_deal ON public.crm_activities(deal_id, occurred_at DESC);
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all_crm_activities ON public.crm_activities FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- crm automations
CREATE TABLE public.crm_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all_crm_automations ON public.crm_automations FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_crm_automations_updated BEFORE UPDATE ON public.crm_automations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.crm_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL,
  trigger_event text NOT NULL,
  entity_type text,
  entity_id uuid,
  status text NOT NULL DEFAULT 'pending',
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX idx_crm_automation_runs_auto ON public.crm_automation_runs(automation_id, started_at DESC);
ALTER TABLE public.crm_automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all_crm_automation_runs ON public.crm_automation_runs FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- outbound webhooks
CREATE TABLE public.outbound_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  secret text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid,
  last_delivery_at timestamptz,
  last_delivery_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.outbound_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all_outbound_webhooks ON public.outbound_webhooks FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_outbound_webhooks_updated BEFORE UPDATE ON public.outbound_webhooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- email log
CREATE TABLE public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  subject text NOT NULL,
  template text,
  body_html text,
  status text NOT NULL DEFAULT 'pending',
  provider_id text,
  related_entity_type text,
  related_entity_id uuid,
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_log_entity ON public.email_log(related_entity_type, related_entity_id);
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all_email_log ON public.email_log FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_ai_insights;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sprint_ai_alerts;
