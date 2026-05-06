
-- Drop the over-permissive policy and recreate as SELECT-only
DROP POLICY IF EXISTS "user_sees_own_role" ON public.user_roles;

CREATE POLICY "user_sees_own_role" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

-- admin_all_user_roles already exists from migration 0004 and covers INSERT/UPDATE/DELETE for admins
-- (no other writes allowed for non-admins)
