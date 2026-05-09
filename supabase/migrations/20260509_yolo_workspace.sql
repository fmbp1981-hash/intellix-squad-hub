-- =============================================================================
-- Yolo workspace + YOLO AI HUB modules + cleanup
-- Date: 2026-05-09
-- =============================================================================

-- 1. Add parent_project_id for sub-project/module hierarchy
ALTER TABLE public.agile_projects
  ADD COLUMN IF NOT EXISTS parent_project_id uuid REFERENCES public.agile_projects(id) ON DELETE CASCADE;

-- 2. Delete IntelliX CRM (not a real project yet)
DELETE FROM public.agile_projects WHERE name = 'IntelliX CRM';

-- 3. Create Yolo workspace
INSERT INTO public.workspaces (client_name, engagement_name, slug, description)
VALUES (
  'Yolo',
  'Projetos Yolo',
  'yolo',
  'Workspace de projetos e produtos da empresa Yolo.'
)
ON CONFLICT (slug) DO NOTHING;

-- 4. Rename Yolo SDR → YOLO AI HUB and move to Yolo workspace
UPDATE public.agile_projects
SET
  name         = 'YOLO AI HUB',
  client_name  = 'Yolo',
  description  = 'Hub de produtos de IA da Yolo — plataforma central que agrupa os módulos Yolo SDR, SmartMatch e Finder.',
  workspace_id = (SELECT id FROM public.workspaces WHERE slug = 'yolo')
WHERE name = 'Yolo SDR';

-- 5. Insert 3 sub-modules under YOLO AI HUB
INSERT INTO public.agile_projects
  (name, client_name, description, project_type, status, is_portfolio, ai_scrum_master, workspace_id, parent_project_id)
SELECT
  t.name,
  'Yolo',
  t.description,
  'scrum',
  'active',
  false,
  true,
  (SELECT id FROM public.workspaces WHERE slug = 'yolo'),
  (SELECT id FROM public.agile_projects WHERE name = 'YOLO AI HUB')
FROM (VALUES
  (
    'Yolo SDR',
    'Módulo SDR automatizado — prospecção inteligente, qualificação de leads em tempo real e agendamento de reuniões via WhatsApp.'
  ),
  (
    'SmartMatch',
    'Módulo de matching inteligente entre perfis e oportunidades usando IA generativa e scoring semântico.'
  ),
  (
    'Finder',
    'Módulo de descoberta e busca avançada de leads qualificados com scoring automático e enriquecimento de dados.'
  )
) AS t(name, description)
ON CONFLICT DO NOTHING;
