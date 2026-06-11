-- Add generated_images column to store multiple AI-generated image options per draft
ALTER TABLE marketing_drafts
  ADD COLUMN IF NOT EXISTS generated_images jsonb;

COMMENT ON COLUMN marketing_drafts.generated_images IS
  'Array of public Storage URLs generated on demand by marketing-image-gen. User picks one to set as image_url.';
