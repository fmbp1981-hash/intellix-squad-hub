-- Marketing drafts: add slide_images for Monday news digest carrossel
-- Each element: { slide: number, title: string, image_url: string|null, copy: string, practical_tip: string }

ALTER TABLE marketing_drafts
  ADD COLUMN IF NOT EXISTS slide_images jsonb;

COMMENT ON COLUMN marketing_drafts.slide_images IS
  'Per-slide data for news digest carrossel (content_type=news_data). Array of {slide, title, image_url, copy, practical_tip}. Populated by marketing-generate edge function.';
