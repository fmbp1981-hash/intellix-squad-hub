
-- View do feed unificado (últimas 24h)
CREATE OR REPLACE VIEW public.vw_dashboard_feed AS
SELECT
  'squad_run'::text AS type,
  sr.id::text AS id,
  COALESCE(sr.squad_name, 'Squad') AS label,
  COALESCE(sr.status, 'pending') AS status,
  COALESCE(sr.completed_at, sr.started_at, sr.created_at) AS at,
  sr.workspace_id::text AS ref_id
FROM public.squad_runs sr
WHERE COALESCE(sr.completed_at, sr.started_at, sr.created_at) > now() - interval '24 hours'
UNION ALL
SELECT
  'internal_job'::text,
  ij.id::text,
  COALESCE(ij.job_id, ij.kind::text, 'job'),
  ij.status::text,
  COALESCE(ij.completed_at, ij.started_at, ij.created_at),
  ij.department
FROM public.internal_jobs ij
WHERE COALESCE(ij.completed_at, ij.started_at, ij.created_at) > now() - interval '24 hours'
UNION ALL
SELECT
  'crm_activity'::text,
  ca.id::text,
  ca.subject,
  ca.type,
  ca.occurred_at,
  COALESCE(ca.deal_id, ca.lead_id, ca.contract_id)::text
FROM public.crm_activities ca
WHERE ca.occurred_at > now() - interval '24 hours';

GRANT SELECT ON public.vw_dashboard_feed TO authenticated;

-- Função consolidada do Dashboard
CREATE OR REPLACE FUNCTION public.dashboard_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  current_month text := to_char(now(), 'YYYY-MM');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'mrr', (
      SELECT COALESCE(SUM(amount), 0)
      FROM invoices
      WHERE status = 'paid' AND to_char(COALESCE(paid_at, issue_date::timestamptz), 'YYYY-MM') = current_month
    ),
    'pipeline_value', (
      SELECT COALESCE(SUM(value), 0) FROM deals WHERE status NOT IN ('won','lost')
    ),
    'pipeline_count', (
      SELECT COUNT(*) FROM deals WHERE status NOT IN ('won','lost')
    ),
    'engagements', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'by_health', jsonb_object_agg(health, c)
      )
      FROM (SELECT health, COUNT(*) AS c FROM engagements WHERE status NOT IN ('completed','archived') GROUP BY health) s
    ),
    'sprints_active', (
      SELECT COUNT(*) FROM sprints WHERE status = 'active'
    ),
    'jobs_running', (
      SELECT COUNT(*) FROM internal_jobs WHERE status::text IN ('pending','running')
    ),
    'feed', (
      SELECT COALESCE(jsonb_agg(row_to_json(f)), '[]'::jsonb)
      FROM (SELECT * FROM vw_dashboard_feed ORDER BY at DESC NULLS LAST LIMIT 10) f
    ),
    'projects', (
      SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb)
      FROM (
        SELECT id, name, client_name, status, total_story_points, completed_points,
               current_velocity
        FROM agile_projects
        WHERE status NOT IN ('completed','archived')
        ORDER BY updated_at DESC LIMIT 6
      ) p
    ),
    'okrs', (
      SELECT COALESCE(jsonb_agg(row_to_json(o)), '[]'::jsonb)
      FROM (
        SELECT id, objective, key_result, department, current_value, target_value, progress, status
        FROM okrs WHERE active = true ORDER BY progress ASC LIMIT 6
      ) o
    ),
    'funnel', (
      SELECT jsonb_object_agg(status, c) FROM (
        SELECT status, COUNT(*) AS c FROM leads GROUP BY status
      ) s
    ),
    'deals_funnel', (
      SELECT jsonb_object_agg(status, c) FROM (
        SELECT status, COUNT(*) AS c FROM deals GROUP BY status
      ) d
    ),
    'invoices_summary', (
      SELECT jsonb_build_object(
        'pending', COALESCE(SUM(amount) FILTER (WHERE status IN ('pending','sent')), 0),
        'overdue', COALESCE(SUM(amount) FILTER (WHERE status = 'overdue'), 0),
        'next_7_days', COALESCE(SUM(amount) FILTER (WHERE status IN ('pending','sent') AND due_date <= (now() + interval '7 days')::date), 0)
      )
      FROM invoices
    ),
    'tokens', (
      SELECT jsonb_build_object(
        'consumed_usd', COALESCE(SUM(total_cost_usd), 0),
        'budget_usd', COALESCE(MAX(budget_usd), 0),
        'by_scope', COALESCE((
          SELECT jsonb_object_agg(scope, total_cost_usd)
          FROM token_usage WHERE period_month = current_month
        ), '{}'::jsonb)
      )
      FROM token_usage WHERE period_month = current_month AND scope = 'global'
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_summary() TO authenticated;
