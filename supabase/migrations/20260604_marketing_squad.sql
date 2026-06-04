-- supabase/migrations/20260604_marketing_squad.sql

do $$ begin
  create type marketing_pilar as enum (
    'resultado_ia',
    'educacao_pratica',
    'bastidores',
    'posicionamento',
    'comercial'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type marketing_status as enum (
    'generated',
    'approved',
    'rejected',
    'published'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type marketing_platform as enum (
    'linkedin',
    'instagram',
    'whatsapp'
  );
exception when duplicate_object then null; end $$;

create table if not exists marketing_drafts (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  content           text not null,
  pilar             marketing_pilar not null,
  platform          marketing_platform not null default 'linkedin',
  status            marketing_status not null default 'generated',
  theme_prompt      text,
  research_snippets jsonb,
  trigger_mode      text not null default 'scheduled',
  approved_at       timestamptz,
  published_at      timestamptz,
  created_at        timestamptz not null default now()
);

alter table marketing_drafts enable row level security;

create policy "marketing_admin_only"
  on marketing_drafts for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create index if not exists idx_marketing_drafts_status on marketing_drafts(status);
create index if not exists idx_marketing_drafts_created_at on marketing_drafts(created_at desc);
