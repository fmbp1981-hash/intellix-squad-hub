-- Migration: marketing weekly research cron job
-- Runs marketing-researcher edge function every Monday at 09:00 BRT (12:00 UTC)
-- Requires: pg_cron, pg_net extensions (both confirmed active)

-- Private schema for internal config (not exposed to anon/authenticated roles)
CREATE SCHEMA IF NOT EXISTS private;

-- Config table to store secrets used by cron jobs
-- Values must be populated manually (cannot be retrieved from Supabase secrets API)
CREATE TABLE IF NOT EXISTS private.app_config (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Restrict access: only postgres (service role) can read/write
REVOKE ALL ON private.app_config FROM anon, authenticated;

-- IMPORTANT: After running this migration, insert the MARKETING_API_KEY value:
-- INSERT INTO private.app_config (key, value)
-- VALUES ('MARKETING_API_KEY', '<actual-key-from-supabase-secrets>')
-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Wrapper function: reads API key from private.app_config and calls edge function via pg_net
CREATE OR REPLACE FUNCTION private.trigger_marketing_researcher()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_key text;
BEGIN
  SELECT value INTO api_key
  FROM private.app_config
  WHERE key = 'MARKETING_API_KEY';

  IF api_key IS NULL THEN
    RAISE WARNING '[cron] MARKETING_API_KEY not set in private.app_config — skipping';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := 'https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/marketing-researcher',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || api_key
    ),
    body    := '{}'::jsonb
  );
END;
$$;

-- pg_cron job: every Monday at 12:00 UTC (09:00 BRT)
SELECT cron.schedule(
  'marketing-weekly-research',
  '0 12 * * 1',
  $$SELECT private.trigger_marketing_researcher()$$
);
