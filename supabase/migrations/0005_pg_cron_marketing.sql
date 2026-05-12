-- ============================================================
-- 0005_pg_cron_marketing.sql
-- Crons do squad de marketing via pg_cron
-- Lúcio: toda segunda 12:00 UTC (09:00 BRT)
-- Maya:  toda segunda 13:00 UTC (10:00 BRT)
-- ============================================================

-- Remove se já existir (idempotente)
SELECT cron.unschedule('lucio-weekly-research') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'lucio-weekly-research'
);
SELECT cron.unschedule('maya-weekly-calendar') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'maya-weekly-calendar'
);

-- Lúcio — segunda 12:00 UTC
SELECT cron.schedule(
  'lucio-weekly-research',
  '0 12 * * 1',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/marketing-weekly-pipeline',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{"step":"lucio_research"}'::jsonb
  )
  $$
);

-- Maya — segunda 13:00 UTC
SELECT cron.schedule(
  'maya-weekly-calendar',
  '0 13 * * 1',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/marketing-weekly-pipeline',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{"step":"maya_calendar"}'::jsonb
  )
  $$
);
