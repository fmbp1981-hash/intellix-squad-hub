-- supabase/migrations/20260608_marketing_llm_config.sql
-- Registra os agentes de pipeline do marketing (ideator + generator) em agent_configs
-- para que o usuário possa trocar provider/modelo via Settings UI sem redeploy.

-- Adiciona ENUM e colunas LLM à tabela agent_configs (idempotente)
DO $$ BEGIN
  CREATE TYPE llm_provider AS ENUM ('openai', 'anthropic', 'google');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE agent_configs
  ADD COLUMN IF NOT EXISTS llm_provider llm_provider DEFAULT 'openai',
  ADD COLUMN IF NOT EXISTS llm_model text DEFAULT 'gpt-4o',
  ADD COLUMN IF NOT EXISTS llm_temperature numeric DEFAULT 0.7,
  ADD COLUMN IF NOT EXISTS llm_max_tokens integer DEFAULT 4096;


-- marketing-ideator: gera 3 ideias de post — padrão Claude Haiku (rápido, barato)
INSERT INTO agent_configs (
  id, squad_id, role, name, persona,
  llm_config_key, active,
  llm_provider, llm_model, llm_temperature, llm_max_tokens,
  position_x, position_y
)
SELECT
  '11111111-2222-3333-4444-000000000001',
  s.id,
  'specialist'::agent_role,
  'marketing-ideator',
  'Pipeline agent — gera 3 ideias de post com base em pesquisa. Modelo configurável pelo usuário.',
  'squad:marketing:ideator',
  true,
  'anthropic'::llm_provider,
  'claude-haiku-4-5-20251001',
  0.8,
  4096,
  600, 100
FROM squad_configs s WHERE s.key = 'internal-marketing'
ON CONFLICT (id) DO UPDATE SET
  llm_provider    = EXCLUDED.llm_provider,
  llm_model       = EXCLUDED.llm_model,
  llm_temperature = EXCLUDED.llm_temperature,
  llm_max_tokens  = EXCLUDED.llm_max_tokens,
  updated_at      = NOW();

-- marketing-generator: escreve o conteúdo final — padrão Claude Sonnet (qualidade)
INSERT INTO agent_configs (
  id, squad_id, role, name, persona,
  llm_config_key, active,
  llm_provider, llm_model, llm_temperature, llm_max_tokens,
  position_x, position_y
)
SELECT
  '11111111-2222-3333-4444-000000000002',
  s.id,
  'specialist'::agent_role,
  'marketing-generator',
  'Pipeline agent — escreve o post final a partir de uma ideia aprovada. Modelo configurável pelo usuário.',
  'squad:marketing:generator',
  true,
  'anthropic'::llm_provider,
  'claude-sonnet-4-6',
  0.7,
  4096,
  700, 100
FROM squad_configs s WHERE s.key = 'internal-marketing'
ON CONFLICT (id) DO UPDATE SET
  llm_provider    = EXCLUDED.llm_provider,
  llm_model       = EXCLUDED.llm_model,
  llm_temperature = EXCLUDED.llm_temperature,
  llm_max_tokens  = EXCLUDED.llm_max_tokens,
  updated_at      = NOW();
