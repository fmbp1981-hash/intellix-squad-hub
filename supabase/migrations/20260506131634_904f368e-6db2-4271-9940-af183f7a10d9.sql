
-- Standardize admin policies to use has_role() consistently
DROP POLICY IF EXISTS "admin_all_templates" ON public.templates;
CREATE POLICY "admin_all_templates" ON public.templates
  FOR ALL TO public
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin_all_workspaces" ON public.workspaces;
CREATE POLICY "admin_all_workspaces" ON public.workspaces
  FOR ALL TO public
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin_all_phases" ON public.workspace_phases;
CREATE POLICY "admin_all_phases" ON public.workspace_phases
  FOR ALL TO public
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin_all_runs" ON public.squad_runs;
CREATE POLICY "admin_all_runs" ON public.squad_runs
  FOR ALL TO public
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Lock down user_roles writes: only service_role may modify; authenticated has SELECT-own only.
-- (RLS already enabled with no INSERT/UPDATE/DELETE policies, so writes via authenticated are denied.)
-- Explicitly revoke direct table writes from anon/authenticated as defense-in-depth.
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;

-- Realtime channel authorization: only admins can subscribe to realtime broadcasts.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_only_realtime_select" ON realtime.messages;
CREATE POLICY "admin_only_realtime_select" ON realtime.messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin_only_realtime_insert" ON realtime.messages;
CREATE POLICY "admin_only_realtime_insert" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
