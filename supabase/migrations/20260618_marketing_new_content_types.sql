-- 2026-06-18: Add weekly_roundup and news_carousel to marketing_content_type enum
-- weekly_roundup: resumão semanal de IA com template branco
-- news_carousel: carrossel de uma notícia específica com deep-dive e imagens por slide

ALTER TYPE marketing_content_type ADD VALUE IF NOT EXISTS 'weekly_roundup';
ALTER TYPE marketing_content_type ADD VALUE IF NOT EXISTS 'news_carousel';
