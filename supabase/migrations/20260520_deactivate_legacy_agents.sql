-- =============================================================================
-- Desativa agentes legados (Ana, Bruno, Flora, Márcio)
--
-- Decisão confirmada por Felipe em 20/05/2026 (SPEC v3.1, seção 5.4):
-- Ana, Bruno, Flora e Márcio são legados inativos nesta fase.
-- Não participam do fluxo de execução. Reativar somente se um squad
-- de execução/delivery for criado no futuro.
--
-- Não deleta — preserva histórico conforme princípio P1 dos pivots.
-- =============================================================================

UPDATE agent_configs
SET
  active         = false,
  show_in_office = false,
  updated_at     = NOW()
WHERE name IN ('Ana', 'Bruno', 'Flora', 'Márcio');

-- Verificação
SELECT name, active, show_in_office
FROM agent_configs
WHERE name IN ('Ana', 'Bruno', 'Flora', 'Márcio')
ORDER BY name;
