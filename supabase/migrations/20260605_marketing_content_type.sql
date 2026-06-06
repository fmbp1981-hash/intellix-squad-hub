-- supabase/migrations/20260605_marketing_content_type.sql
-- Adiciona content_type e needs_image à tabela marketing_drafts

do $$ begin
  create type marketing_content_type as enum (
    'informational',
    'product_promotion',
    'virada_inteligente',
    'news_data'
  );
exception when duplicate_object then null; end $$;

alter table marketing_drafts
  add column if not exists content_type marketing_content_type not null default 'informational',
  add column if not exists needs_image  boolean                not null default false;

create index if not exists idx_marketing_drafts_content_type on marketing_drafts(content_type);
create index if not exists idx_marketing_drafts_needs_image  on marketing_drafts(needs_image) where needs_image = true;
