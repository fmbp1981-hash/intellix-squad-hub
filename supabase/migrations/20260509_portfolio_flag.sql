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

-- 3. Seed: 15 projetos IntelliX.AI no sistema (live = portfólio, dev = em andamento)

-- LIVE → is_portfolio = true, status = completed
INSERT INTO public.agile_projects (name, client_name, description, project_type, status, is_portfolio, ai_scrum_master) VALUES
(
  'LeadFinder Pro',
  'XPAG Brasil',
  'Plataforma de prospecção inteligente que automatiza a identificação de leads qualificados, o primeiro contato via WhatsApp e o acompanhamento até a conversão. Desenvolvida para equipes de vendas que precisam escalar a prospecção sem aumentar o time.',
  'kanban', 'completed', true, false
),
(
  'SmartZap',
  'IntelliX.AI',
  'Ferramenta de automação para WhatsApp Marketing que permite disparar campanhas segmentadas, criar fluxos de atendimento automatizados e qualificar leads com inteligência artificial, reduzindo o tempo de resposta e aumentando a taxa de conversão.',
  'kanban', 'completed', true, false
),
(
  'Cavendish CCE Site',
  'Cavendish Consultoria Empresarial',
  'Site institucional da Cavendish Consultoria Empresarial, apresentando os serviços de transformação organizacional, metodologias de gestão aplicadas e cases de sucesso com empresas de médio e grande porte.',
  'kanban', 'completed', true, false
),
(
  'AutoGram Creator',
  'IntelliX.AI',
  'Plataforma que gera automaticamente posts completos para Instagram — texto, legenda e imagem criada por IA — reduzindo em horas o trabalho diário de criação de conteúdo para marcas e criadores.',
  'kanban', 'completed', true, false
),
(
  'IntelliX.AI Site',
  'IntelliX.AI',
  'Site institucional da IntelliX.AI apresentando a empresa, seus produtos de automação inteligente, casos de uso reais e o portfólio de soluções desenvolvidas para clientes de diferentes segmentos.',
  'kanban', 'completed', true, false
),
(
  'BYH Site',
  'Cavendish Consultoria Empresarial',
  'Site da marca BYH, iniciativa da Cavendish voltada a jovens líderes e empreendedores. Apresenta o programa, seus valores, trilhas de desenvolvimento e canais de inscrição para a próxima geração de gestores.',
  'kanban', 'completed', true, false
),
(
  'XPAG Brasil One Page',
  'XPAG Brasil',
  'Landing page institucional da XPAG Brasil com apresentação da empresa, proposta de valor única e canais diretos de contato com a equipe comercial, focada em captação de novos negócios e parcerias.',
  'kanban', 'completed', true, false
);

-- DEV → is_portfolio = false, status = active
INSERT INTO public.agile_projects (name, client_name, description, project_type, status, is_portfolio, ai_scrum_master) VALUES
(
  'Yolo SDR',
  'IntelliX.AI',
  'Agente SDR (Sales Development Representative) totalmente automatizado que prospecta ativamente, qualifica leads em tempo real e agenda reuniões comerciais via WhatsApp, sem necessidade de intervenção humana no processo.',
  'scrum', 'active', false, true
),
(
  'Sistema GIG',
  'Cavendish Consultoria Empresarial',
  'Sistema de Gestão Integrada para consultoria empresarial com módulos de controle de projetos, alocação de consultores, gestão de entregas e acompanhamento de resultados consolidados por cliente.',
  'scrum', 'active', false, true
),
(
  'Allo Oral Gestão',
  'Allo Oral Clinic',
  'Sistema completo de gestão para clínica odontológica com agendamento online, prontuário eletrônico, controle financeiro e ferramentas de relacionamento com pacientes para fidelização e reativação.',
  'scrum', 'active', false, true
),
(
  'IntelliX CRM',
  'IntelliX.AI',
  'CRM interno da IntelliX.AI para gestão do pipeline comercial, acompanhamento de propostas, controle de contratos e histórico completo de relacionamento com clientes e parceiros estratégicos.',
  'scrum', 'active', false, true
),
(
  'Clear Decision',
  'Clear Decision',
  'Plataforma de apoio à decisão empresarial com análise de cenários, simulações financeiras e dashboards estratégicos, desenvolvida para líderes que precisam decidir com mais dados e menos incerteza.',
  'scrum', 'active', false, true
),
(
  'VO.AI',
  'VO.AI',
  'Plataforma de criação de conteúdo em vídeo com inteligência artificial, oferecendo geração de roteiros, narração automática e montagem assistida para produção de vídeos profissionais em escala.',
  'scrum', 'active', false, true
),
(
  'VibeGuard Monitor',
  'IntelliX.AI',
  'Monitor contínuo de saúde de repositórios de código que analisa qualidade, detecta vulnerabilidades e avalia conformidade com boas práticas de desenvolvimento, gerando relatórios acionáveis para o time de engenharia.',
  'scrum', 'active', false, true
);

-- ARCHIVED → is_portfolio = false, status = cancelled
INSERT INTO public.agile_projects (name, client_name, description, project_type, status, is_portfolio, ai_scrum_master) VALUES
(
  'Cavendish Group Website',
  'Cavendish Consultoria Empresarial',
  'Versão inicial do site do grupo Cavendish com visão consolidada das marcas e iniciativas do grupo. Substituído por versões mais especializadas por marca, este projeto serviu como referência para os desenvolvimentos posteriores.',
  'kanban', 'cancelled', false, false
);
