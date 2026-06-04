-- supabase/migrations/20260604_marketing_squad.sql

create type marketing_pilar as enum (
  'resultado_ia',
  'educacao_pratica',
  'bastidores',
  'posicionamento',
  'comercial'
);

create type marketing_status as enum (
  'generated',
  'approved',
  'rejected',
  'published'
);

create type marketing_platform as enum (
  'linkedin',
  'instagram',
  'whatsapp'
);

create table marketing_drafts (
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

create policy "marketing admin only"
  on marketing_drafts for all
  using (auth.jwt() ->> 'role' = 'admin');
