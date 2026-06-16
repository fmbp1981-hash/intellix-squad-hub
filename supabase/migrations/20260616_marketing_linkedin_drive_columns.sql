-- Sprint C: rastreamento de publicação LinkedIn + backup Google Drive

ALTER TABLE marketing_drafts
  ADD COLUMN IF NOT EXISTS instagram_post_id TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_post_id  TEXT,
  ADD COLUMN IF NOT EXISTS drive_backup_url  TEXT,
  ADD COLUMN IF NOT EXISTS drive_backup_id   TEXT;

COMMENT ON COLUMN marketing_drafts.instagram_post_id IS 'ID do media publicado no Instagram Graph API';
COMMENT ON COLUMN marketing_drafts.linkedin_post_id  IS 'URN do ugcPost publicado no LinkedIn (ex: urn:li:ugcPost:123)';
COMMENT ON COLUMN marketing_drafts.drive_backup_url  IS 'URL da pasta do Google Drive com o backup deste post';
COMMENT ON COLUMN marketing_drafts.drive_backup_id   IS 'ID da pasta do Google Drive com o backup deste post';
