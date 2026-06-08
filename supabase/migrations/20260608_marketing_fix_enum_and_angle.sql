-- supabase/migrations/20260608_marketing_fix_enum_and_angle.sql
-- Fix 1: adiciona 'idea_pending' ao enum marketing_status
-- Fix 2: adiciona coluna 'angle' que o orchestrator insere mas não existia na tabela

alter type marketing_status add value if not exists 'idea_pending' before 'generated';

alter table marketing_drafts
  add column if not exists angle text;
