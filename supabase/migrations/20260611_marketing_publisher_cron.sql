-- Daily cron: publish approved Instagram posts at 08:00 UTC (05:00 BRT)
-- Calls marketing-publisher edge function for drafts with scheduled_for <= today

SELECT cron.schedule(
  'marketing-daily-publish',
  '0 8 * * *',
  $$
  DECLARE
    api_key text;
  BEGIN
    SELECT value INTO api_key FROM private.app_config WHERE key = 'MARKETING_API_KEY';
    IF api_key IS NULL THEN
      RAISE WARNING '[cron] MARKETING_API_KEY not set in private.app_config — skipping';
      RETURN;
    END IF;

    PERFORM net.http_post(
      url := 'https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/marketing-publisher',
      headers := jsonb_build_object(
        'Content-Type',   'application/json',
        'Authorization',  'Bearer ' || api_key
      ),
      body := '{}'::jsonb
    );
  END;
  $$
);
