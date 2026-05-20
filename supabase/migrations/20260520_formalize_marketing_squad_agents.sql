-- =============================================================================
-- Formaliza agentes do Squad Marketing (migration retroativa)
--
-- Iris, Lúcio, Otto, Sofia, Téo, Vera existem no banco de produção desde
-- 12-14/05/2026 mas foram inseridos via interface Lovable sem migration SQL.
--
-- Esta migration reproduz o estado atual de forma idempotente:
--   - ON CONFLICT (id) → não sobrescreve dados mais recentes
--   - persona: preserva se não vazia; usa placeholder só se vazia
--   - agent_key: preenche se vazio; não sobrescreve se já existe
--
-- NÃO inclui: Bia, Carlos, Maya, Ana, Bruno, Flora, Márcio, Ágata, Heitor, Roberto
-- NÃO executa em produção sem aprovação de Felipe.
-- =============================================================================

-- Garantir squad internal-marketing existe (idempotente)
INSERT INTO squad_configs (key, name, department, description, active)
VALUES (
  'internal-marketing',
  'Marketing',
  'marketing',
  'Squad de Marketing Interno — curadoria, pesquisa, inteligência, copy, direção de arte e revisão.',
  true
)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- IRIS — Content Curator (id: a3d03c9b-dce6-438e-9d12-f2ddb8a3f5a2)
-- criado em 2026-05-14, persona vazia → recebe placeholder
-- =============================================================================
INSERT INTO agent_configs (
  id, squad_id, role, name, persona,
  llm_config_key, agent_key, active, show_in_office,
  position_x, position_y, created_at
)
SELECT
  'a3d03c9b-dce6-438e-9d12-f2ddb8a3f5a2',
  s.id,
  'content-curator'::agent_role,
  'Iris',
  '# Iris — Content Curator IntelliX.AI

[PLACEHOLDER — persona a completar na Fase B]
Curadora de conteúdo externo relevante para a IntelliX.AI.
Seleciona referências, tendências e material de apoio para o squad de marketing.',
  'squad:marketing:curator',
  'iris',
  true, false, 200, 300,
  '2026-05-14 20:17:57.9099+00'
FROM squad_configs s WHERE s.key = 'internal-marketing'
ON CONFLICT (id) DO UPDATE SET
  agent_key  = COALESCE(NULLIF(agent_configs.agent_key, ''), 'iris'),
  persona    = CASE
                 WHEN agent_configs.persona IS NULL OR agent_configs.persona = ''
                 THEN EXCLUDED.persona
                 ELSE agent_configs.persona
               END,
  updated_at = NOW();

-- =============================================================================
-- LÚCIO — Lead Analyst / Researcher (id: f2b49082-980a-46f7-97fa-8e0d84e84e80)
-- criado em 2026-05-12, persona curta existente → preservada
-- =============================================================================
INSERT INTO agent_configs (
  id, squad_id, role, name, persona,
  llm_config_key, agent_key, active, show_in_office,
  position_x, position_y, created_at
)
SELECT
  'f2b49082-980a-46f7-97fa-8e0d84e84e80',
  s.id,
  'lead-analyst'::agent_role,
  'Lúcio',
  '# Lúcio — Researcher IntelliX.AI

[PLACEHOLDER — persona a completar na Fase B]
Pesquisador de tendências e inteligência de mercado.
Radar semanal de IA aplicada para PMEs brasileiras.',
  'squad:marketing:researcher',
  'lucio',
  true, false, 100, 200,
  '2026-05-12 12:27:36.340086+00'
FROM squad_configs s WHERE s.key = 'internal-marketing'
ON CONFLICT (id) DO UPDATE SET
  agent_key  = COALESCE(NULLIF(agent_configs.agent_key, ''), 'lucio'),
  persona    = CASE
                 WHEN agent_configs.persona IS NULL OR agent_configs.persona = ''
                 THEN EXCLUDED.persona
                 ELSE agent_configs.persona
               END,
  updated_at = NOW();

-- =============================================================================
-- OTTO — Intelligence Analyst (id: 3c90e525-78fb-4a75-bd24-588969525f41)
-- criado em 2026-05-14, persona vazia → recebe placeholder
-- =============================================================================
INSERT INTO agent_configs (
  id, squad_id, role, name, persona,
  llm_config_key, agent_key, active, show_in_office,
  position_x, position_y, created_at
)
SELECT
  '3c90e525-78fb-4a75-bd24-588969525f41',
  s.id,
  'intelligence-analyst'::agent_role,
  'Otto',
  '# Otto — Intelligence Analyst IntelliX.AI

[PLACEHOLDER — persona a completar na Fase B]
Analista de inteligência do Squad Marketing.
Analisa dados de engajamento e performance de conteúdo.',
  'squad:marketing:intelligence',
  'otto',
  true, false, 400, 300,
  '2026-05-14 20:17:57.9099+00'
FROM squad_configs s WHERE s.key = 'internal-marketing'
ON CONFLICT (id) DO UPDATE SET
  agent_key  = COALESCE(NULLIF(agent_configs.agent_key, ''), 'otto'),
  persona    = CASE
                 WHEN agent_configs.persona IS NULL OR agent_configs.persona = ''
                 THEN EXCLUDED.persona
                 ELSE agent_configs.persona
               END,
  updated_at = NOW();

-- =============================================================================
-- SOFIA — Reviewer / Editor (id: 3ff32a68-fa36-4c97-8f10-80f4692e930e)
-- criado em 2026-05-12, persona curta existente → preservada
-- =============================================================================
INSERT INTO agent_configs (
  id, squad_id, role, name, persona,
  llm_config_key, agent_key, active, show_in_office,
  position_x, position_y, created_at
)
SELECT
  '3ff32a68-fa36-4c97-8f10-80f4692e930e',
  s.id,
  'reviewer'::agent_role,
  'Sofia',
  '# Sofia — Reviewer / Editor IntelliX.AI

[PLACEHOLDER — persona a completar na Fase B]
Revisora de qualidade e editora-chefe do Squad Marketing.
Última revisão antes do conteúdo ir ao mercado.',
  'squad:marketing:editor',
  'sofia',
  true, false, 700, 200,
  '2026-05-12 12:33:55.882871+00'
FROM squad_configs s WHERE s.key = 'internal-marketing'
ON CONFLICT (id) DO UPDATE SET
  agent_key  = COALESCE(NULLIF(agent_configs.agent_key, ''), 'sofia'),
  updated_at = NOW();

-- =============================================================================
-- TÉO — Specialist / Copywriter (id: a2a562ce-2feb-4ec3-9677-74ec4ce63e69)
-- criado em 2026-05-12, persona curta existente → preservada
-- =============================================================================
INSERT INTO agent_configs (
  id, squad_id, role, name, persona,
  llm_config_key, agent_key, active, show_in_office,
  position_x, position_y, created_at
)
SELECT
  'a2a562ce-2feb-4ec3-9677-74ec4ce63e69',
  s.id,
  'specialist'::agent_role,
  'Téo',
  '# Téo — Copywriter IntelliX.AI

[PLACEHOLDER — persona a completar na Fase B]
Copywriter multi-canal do Squad Marketing.
Instagram e LinkedIn com frameworks AIDA/PAS/BAB/FAB.',
  'squad:marketing:copywriter',
  'teo',
  true, false, 300, 200,
  '2026-05-12 12:29:55.080924+00'
FROM squad_configs s WHERE s.key = 'internal-marketing'
ON CONFLICT (id) DO UPDATE SET
  agent_key  = COALESCE(NULLIF(agent_configs.agent_key, ''), 'teo'),
  updated_at = NOW();

-- =============================================================================
-- VERA — Specialist / Art Director (id: 8c5b1f11-a288-4ff1-a845-24a2fe6a7d33)
-- criado em 2026-05-12, persona curta existente → preservada
-- =============================================================================
INSERT INTO agent_configs (
  id, squad_id, role, name, persona,
  llm_config_key, agent_key, active, show_in_office,
  position_x, position_y, created_at
)
SELECT
  '8c5b1f11-a288-4ff1-a845-24a2fe6a7d33',
  s.id,
  'specialist'::agent_role,
  'Vera',
  '# Vera — Art Director IntelliX.AI

[PLACEHOLDER — persona a completar na Fase B]
Diretora de arte do Squad Marketing.
Briefings visuais: prompts Midjourney/Ideogram, composição, paleta, tipografia.',
  'squad:marketing:art-director',
  'vera',
  true, false, 500, 200,
  '2026-05-12 12:31:58.093871+00'
FROM squad_configs s WHERE s.key = 'internal-marketing'
ON CONFLICT (id) DO UPDATE SET
  agent_key  = COALESCE(NULLIF(agent_configs.agent_key, ''), 'vera'),
  updated_at = NOW();

-- =============================================================================
-- VERIFICAÇÃO FINAL
-- =============================================================================
SELECT
  ac.name,
  ac.role::text       AS role,
  ac.agent_key,
  ac.llm_config_key,
  sc.key              AS squad_key,
  ac.active,
  ac.show_in_office,
  length(ac.persona)  AS persona_chars
FROM agent_configs ac
JOIN squad_configs sc ON ac.squad_id = sc.id
WHERE ac.name IN ('Iris', 'Lúcio', 'Otto', 'Sofia', 'Téo', 'Vera')
ORDER BY ac.name;
