-- supabase/migrations/20260609_marketing_scheduled_for.sql

ALTER TABLE marketing_drafts
  ADD COLUMN IF NOT EXISTS scheduled_for date,
  ADD COLUMN IF NOT EXISTS week_of      date;

CREATE INDEX IF NOT EXISTS idx_marketing_drafts_scheduled_for
  ON marketing_drafts (scheduled_for)
  WHERE scheduled_for IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_drafts_week_of
  ON marketing_drafts (week_of)
  WHERE week_of IS NOT NULL;
