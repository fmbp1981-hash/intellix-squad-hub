
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- unschedule if exist
DO $$
DECLARE j text;
BEGIN
  FOR j IN SELECT jobname FROM cron.job WHERE jobname IN ('opensquad-run-step','opensquad-notif-dispatcher','opensquad-daily-report') LOOP
    PERFORM cron.unschedule(j);
  END LOOP;
END $$;

SELECT cron.schedule(
  'opensquad-run-step',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/run-step',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5bmFkd2x3cnNjdmp1YnJ5cWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NjA1NzYsImV4cCI6MjA5MzQzNjU3Nn0.uY07zCOyfPQq6MPBiiiKE5SqVNdBmkzB2pxNUc7dUNQ","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5bmFkd2x3cnNjdmp1YnJ5cWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NjA1NzYsImV4cCI6MjA5MzQzNjU3Nn0.uY07zCOyfPQq6MPBiiiKE5SqVNdBmkzB2pxNUc7dUNQ"}'::jsonb,
    body:='{"trigger":"cron"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'opensquad-notif-dispatcher',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/notification-dispatcher',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5bmFkd2x3cnNjdmp1YnJ5cWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NjA1NzYsImV4cCI6MjA5MzQzNjU3Nn0.uY07zCOyfPQq6MPBiiiKE5SqVNdBmkzB2pxNUc7dUNQ","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5bmFkd2x3cnNjdmp1YnJ5cWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NjA1NzYsImV4cCI6MjA5MzQzNjU3Nn0.uY07zCOyfPQq6MPBiiiKE5SqVNdBmkzB2pxNUc7dUNQ"}'::jsonb,
    body:='{"trigger":"cron"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'opensquad-daily-report',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url:='https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/internal-job-trigger',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5bmFkd2x3cnNjdmp1YnJ5cWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NjA1NzYsImV4cCI6MjA5MzQzNjU3Nn0.uY07zCOyfPQq6MPBiiiKE5SqVNdBmkzB2pxNUc7dUNQ","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5bmFkd2x3cnNjdmp1YnJ5cWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NjA1NzYsImV4cCI6MjA5MzQzNjU3Nn0.uY07zCOyfPQq6MPBiiiKE5SqVNdBmkzB2pxNUc7dUNQ"}'::jsonb,
    body:='{"kind":"daily_report","trigger":"cron"}'::jsonb
  );
  $$
);
