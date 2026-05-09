-- =============================================================================
-- Portfolio Projects — IntelliX OpenSquad Platform
-- Date: 2026-05-09
-- =============================================================================

CREATE TYPE portfolio_category AS ENUM ('saas', 'site', 'crm', 'internal', 'automation');
CREATE TYPE portfolio_status   AS ENUM ('live', 'dev', 'archived');

CREATE TABLE portfolio_projects (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vercel_project_id text UNIQUE,
  name              text NOT NULL,
  client_name       text NOT NULL,
  description       text,
  category          portfolio_category NOT NULL DEFAULT 'saas',
  tech_stack        text[] NOT NULL DEFAULT '{}',
  url               text,
  status            portfolio_status NOT NULL DEFAULT 'live',
  workspace_id      uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  thumbnail_url     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE portfolio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_projects_select" ON portfolio_projects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "portfolio_projects_all" ON portfolio_projects
  FOR ALL USING (auth.role() = 'authenticated');

CREATE TRIGGER portfolio_projects_updated_at
  BEFORE UPDATE ON portfolio_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- Seed: Projetos Vercel mapeados (15 projetos)
-- =============================================================================

INSERT INTO portfolio_projects (vercel_project_id, name, client_name, description, category, tech_stack, url, status) VALUES
  ('prj_tv1LLMqIYFCj9B7f2jEhi8FSLr3E', 'LeadFinder Pro', 'XPAG Brasil', 'Plataforma de prospecção com IA e WhatsApp', 'saas', ARRAY['Next.js 14','TypeScript','Supabase','OpenAI','Evolution API'], 'https://prospect-pulse-54.vercel.app', 'live'),
  ('prj_xcRUmAQAVatE52bUNyLRXQCC1ugy', 'Yolo SDR', 'IntelliX.AI', 'SDR automatizado com agentes IA e WhatsApp', 'saas', ARRAY['Next.js 15','TypeScript','Supabase','Evolution API'], 'https://yolo-sdr.vercel.app', 'dev'),
  ('prj_paTPo5OBnkCtMnq2VBT75K7nYmbP', 'SmartZap', 'IntelliX.AI', 'Automação de WhatsApp Marketing', 'automation', ARRAY['Next.js','TypeScript','Evolution API'], 'https://intellix-ai-smartzap.vercel.app', 'live'),
  ('prj_Xf2BzOXgFyVOCMo60zomdxNJUJIF', 'Sistema GIG', 'Cavendish Consultoria', 'Gestão Integrada de Gestão (consultoria empresarial)', 'saas', ARRAY['Next.js 15','TypeScript','Supabase','GPT-4'], 'https://cavendish-gig.vercel.app', 'dev'),
  ('prj_7UIqlWHayESD0xJ3jx0RDPrykjOl', 'Allo Oral Gestão', 'Allo Oral Clinic', 'Sistema de gestão para clínica odontológica', 'saas', ARRAY['Next.js','TypeScript','Supabase'], 'https://allo-oral-clinic-gest-o.vercel.app', 'dev'),
  ('prj_XieFVPLjs6G6bcIfp7aJAj75Hmuw', 'IntelliX CRM', 'IntelliX.AI', 'CRM interno para gestão de leads e negócios', 'crm', ARRAY['Next.js','TypeScript','Supabase'], 'https://intelli-x-ai-crm.vercel.app', 'dev'),
  ('prj_UUHcdbnbdomkxIQfLvQjfjMMitbb', 'Cavendish CCE Site', 'Cavendish Consultoria', 'Site institucional da Cavendish Consultoria Empresarial', 'site', ARRAY['Next.js','TypeScript','Tailwind CSS'], 'https://grupo-cavendish-cce-site.vercel.app', 'live'),
  ('prj_O3qlKZBc8wuvFN1IrCNCTN2RbnGX', 'Cavendish Group Website', 'Cavendish Consultoria', 'Site do grupo Cavendish (v0 gerado por IA)', 'site', ARRAY['Next.js','TypeScript','Tailwind CSS'], 'https://v0-cavendish-group-website.vercel.app', 'archived'),
  ('prj_hRObikViwBzX9yCgj7s61g9N6AAB', 'AutoGram Creator', 'IntelliX.AI', 'Gerador automático de posts para Instagram com IA', 'automation', ARRAY['Next.js','TypeScript','OpenAI','DALL-E'], 'https://auto-gram-creator.vercel.app', 'live'),
  ('prj_c75Fr7V0as7sVN3h2Q6xFBHTgkIO', 'IntelliX.AI', 'IntelliX.AI', 'Site institucional da IntelliX.AI', 'site', ARRAY['Next.js','TypeScript','Tailwind CSS'], 'https://intellixai.vercel.app', 'live'),
  ('prj_iXqqpjazT0lwcoQJV5BFqfcxbGit', 'BYH Site', 'Cavendish Consultoria', 'Site para a marca BYH (Cavendish)', 'site', ARRAY['Next.js','TypeScript','Tailwind CSS'], 'https://grupo-cavendish-byh-site.vercel.app', 'live'),
  ('prj_vAFicWvueZ1sGObZKCkAyeQ9P16U', 'Clear Decision', 'Clear Decision', 'Plataforma de apoio a decisões empresariais', 'saas', ARRAY['Next.js','TypeScript','Supabase'], 'https://clear-decision-leap.vercel.app', 'dev'),
  ('prj_Id3cVyNh6MpzN5lRDjg8nxAPaGqP', 'VO.AI', 'VO.AI', 'Plataforma de IA para criação de conteúdo em vídeo', 'saas', ARRAY['Next.js','TypeScript','OpenAI'], 'https://vo-ai.vercel.app', 'dev'),
  ('prj_EImg7J5TuTy3cdXlWRtpMfh7X0ZR', 'XPAG Brasil One Page', 'XPAG Brasil', 'Landing page da XPAG Brasil', 'site', ARRAY['Next.js','TypeScript','Tailwind CSS'], 'https://xpagbrasil-one-page.vercel.app', 'live'),
  ('prj_PGxgS3dunNJs4CZgLCiPjuhyuZPQ', 'VibeGuard Monitor', 'IntelliX.AI', 'Monitor de segurança e vibe check de repositórios', 'internal', ARRAY['Next.js','TypeScript','GitHub API'], 'https://vibeguard-monitor.vercel.app', 'dev');
