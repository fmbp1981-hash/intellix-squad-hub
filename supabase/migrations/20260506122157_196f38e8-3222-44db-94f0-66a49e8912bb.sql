
-- Enable extensions for cron + http
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- audit_log
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON public.audit_log(entity, entity_id);
CREATE INDEX idx_audit_at ON public.audit_log(at DESC);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_audit" ON public.audit_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- notifications
DO $$ BEGIN
  CREATE TYPE public.notification_channel AS ENUM ('app','whatsapp','email');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_status AS ENUM ('pending','sent','failed','skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel public.notification_channel NOT NULL DEFAULT 'app',
  title text NOT NULL,
  body text,
  link text,
  status public.notification_status NOT NULL DEFAULT 'pending',
  error text,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read_at);
CREATE INDEX idx_notifications_pending ON public.notifications(status, created_at) WHERE status = 'pending';
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_sees_own_notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_marks_own_read" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin_all_notifications" ON public.notifications
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
