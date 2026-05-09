-- =============================================================================
-- Portfolio flag on agile_projects + drop portfolio_projects table
-- Date: 2026-05-09
-- =============================================================================

-- 1. Add is_portfolio flag
ALTER TABLE public.agile_projects
  ADD COLUMN IF NOT EXISTS is_portfolio boolean NOT NULL DEFAULT false;

-- 2. Drop portfolio_projects (replaced by agile_projects + is_portfolio)
DROP TABLE IF EXISTS public.portfolio_projects;
DROP TYPE IF EXISTS portfolio_category;
DROP TYPE IF EXISTS portfolio_status;

-- 3. Seed workspaces (3 clients)
INSERT INTO public.workspaces (client_name, engagement_name, slug, description)
VALUES
  ('XPAG Brasil', 'Engagement XPAG Brasil', 'xpag-brasil',
   'Workspace de projetos e engagements com XPAG Brasil.'),
  ('Cavendish Consultoria Empresarial', 'Engagement Cavendish', 'cavendish-consultoria',
   'Workspace de projetos e engagements com Cavendish Consultoria Empresarial.'),
  ('IntelliX.AI', 'Projetos Internos IntelliX', 'intellix-ai',
   'Workspace de projetos internos da IntelliX.AI.')
ON CONFLICT (slug) DO NOTHING;

-- 4. Seed agile_projects (9 projetos aprovados)

-- LIVE → is_portfolio = true, status = completed
INSERT INTO public.agile_projects (name, client_name, description, project_type, status, is_portfolio, ai_scrum_master, workspace_id)
SELECT name, client_name, description, project_type, status, is_portfolio, ai_scrum_master,
       (SELECT id FROM public.workspaces WHERE slug = workspace_slug)
FROM (VALUES
  ('LeadFinder Pro', 'XPAG Brasil',
   'Plataforma de prospecção inteligente que automatiza a identificação de leads qualificados, o primeiro contato via WhatsApp e o acompanhamento até a conversão.',
   'kanban', 'completed', true, false, 'xpag-brasil'),
  ('XPAG Brasil One Page', 'XPAG Brasil',
   'Landing page institucional da XPAG Brasil com apresentação da empresa, proposta de valor única e canais diretos de contato com a equipe comercial.',
   'kanban', 'completed', true, false, 'xpag-brasil'),
  ('Cavendish CCE Site', 'Cavendish Consultoria Empresarial',
   'Site institucional da Cavendish Consultoria Empresarial, apresentando os serviços de transformação organizacional e metodologias de gestão.',
   'kanban', 'completed', true, false, 'cavendish-consultoria'),
  ('BYH Site', 'Cavendish Consultoria Empresarial',
   'Site da marca BYH, iniciativa da Cavendish voltada a jovens líderes e empreendedores.',
   'kanban', 'completed', true, false, 'cavendish-consultoria'),
  ('IntelliX.AI Site', 'IntelliX.AI',
   'Site institucional da IntelliX.AI apresentando a empresa, seus produtos de automação inteligente e portfólio.',
   'kanban', 'completed', true, false, 'intellix-ai')
) AS t(name, client_name, description, project_type, status, is_portfolio, ai_scrum_master, workspace_slug);

-- ACTIVE → is_portfolio = false, status = active
INSERT INTO public.agile_projects (name, client_name, description, project_type, status, is_portfolio, ai_scrum_master, workspace_id)
SELECT name, client_name, description, project_type, status, is_portfolio, ai_scrum_master,
       (SELECT id FROM public.workspaces WHERE slug = workspace_slug)
FROM (VALUES
  ('Yolo SDR', 'IntelliX.AI',
   'Agente SDR totalmente automatizado que prospecta, qualifica leads em tempo real e agenda reuniões comerciais via WhatsApp.',
   'scrum', 'active', false, true, 'intellix-ai'),
  ('Sistema GIG', 'Cavendish Consultoria Empresarial',
   'Sistema de Gestão Integrada para consultoria empresarial com módulos de controle de projetos, alocação de consultores e gestão de entregas.',
   'scrum', 'active', false, true, 'cavendish-consultoria'),
  ('IntelliX CRM', 'IntelliX.AI',
   'CRM interno da IntelliX.AI para gestão do pipeline comercial, propostas, contratos e relacionamento com clientes.',
   'scrum', 'active', false, true, 'intellix-ai')
) AS t(name, client_name, description, project_type, status, is_portfolio, ai_scrum_master, workspace_slug);

-- ARCHIVED → status = cancelled
INSERT INTO public.agile_projects (name, client_name, description, project_type, status, is_portfolio, ai_scrum_master, workspace_id)
SELECT name, client_name, description, project_type, status, is_portfolio, ai_scrum_master,
       (SELECT id FROM public.workspaces WHERE slug = workspace_slug)
FROM (VALUES
  ('Cavendish Group Website', 'Cavendish Consultoria Empresarial',
   'Versão inicial do site do grupo Cavendish. Substituído por versões mais especializadas por marca.',
   'kanban', 'cancelled', false, false, 'cavendish-consultoria')
) AS t(name, client_name, description, project_type, status, is_portfolio, ai_scrum_master, workspace_slug);
