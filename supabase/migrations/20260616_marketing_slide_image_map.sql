ALTER TABLE marketing_drafts
  ADD COLUMN IF NOT EXISTS slide_image_map jsonb;
