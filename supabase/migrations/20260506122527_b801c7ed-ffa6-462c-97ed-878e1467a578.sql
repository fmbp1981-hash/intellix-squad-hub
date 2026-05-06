
-- 12 squads
INSERT INTO public.squad_configs (key, name, department, description, default_llm_config) VALUES
  ('delivery-research',     'Squad Pesquisa',           'delivery',  'Análise de mercado, benchmark, descoberta',                       'squad:default:specialist'),
  ('delivery-strategy',     'Squad Estratégia',         'delivery',  'Posicionamento, narrativa, plano de jogo',                        'squad:default:strategist'),
  ('delivery-content',      'Squad Conteúdo',           'delivery',  'Roteiro, copy, materiais',                                        'squad:default:specialist'),
  ('delivery-review',       'Squad Revisão',            'delivery',  'QA, polimento e consistência',                                    'squad:default:reviewer'),
  ('internal-gestao',       'Gestão Interna',           'gestao',    'Ágata coordena standups, revisões e relatórios',                  'internal:gestao:daily-standup'),
  ('internal-rh',           'RH Interno',               'rh',        'Maya gerencia onboarding, cultura e performance dos agentes',     'squad:default:specialist'),
  ('internal-financeiro',   'Financeiro Interno',       'financeiro','Flora controla orçamento, custos de tokens e relatórios',         'job-weight:light'),
  ('internal-marketing',    'Marketing Interno',        'marketing', 'Márcio cuida de posicionamento institucional e cases',            'squad:default:specialist'),
  ('internal-ti',           'TI Interno',               'ti',        'Heitor monitora saúde dos serviços, latência e incidentes',       'internal:gestao:incident-response'),
  ('internal-juridico',     'Jurídico Interno',         'juridico',  'Compliance e contratos',                                          'job-weight:heavy'),
  ('internal-comercial',    'Comercial Interno',        'comercial', 'Pré-venda e qualificação',                                        'squad:default:specialist'),
  ('internal-cs',           'Customer Success Interno', 'cs',        'Saúde de clientes, expansão e renovação',                         'squad:default:specialist');

-- Agentes operacionais (entrega) — 4 agentes em cada squad de entrega
WITH d AS (
  SELECT id, key FROM public.squad_configs WHERE department = 'delivery'
)
INSERT INTO public.agent_configs (squad_id, role, name, persona, llm_config_key, position_x, position_y)
SELECT d.id, x.role::public.agent_role, x.name, x.persona, x.cfg, x.px, x.py
FROM d, LATERAL (VALUES
  ('lead-analyst', 'Ana',     'Analista líder, faz briefing reverso e mapa de stakeholders', 'squad:default:lead-analyst', 100, 200),
  ('specialist',   'Carlos',  'Especialista executor, produz o entregável principal',         'squad:default:specialist',   300, 200),
  ('strategist',   'Beatriz', 'Estrategista, valida tese e ajusta narrativa',                 'squad:default:strategist',   500, 200),
  ('reviewer',     'Roberto', 'Revisor final, garante qualidade e consistência',              'squad:default:reviewer',     700, 200)
) AS x(role, name, persona, cfg, px, py);

-- Agentes internos (gestão)
INSERT INTO public.agent_configs (squad_id, role, name, persona, llm_config_key, position_x, position_y)
SELECT s.id, 'manager'::public.agent_role, x.name, x.persona, x.cfg, x.px, x.py
FROM (VALUES
  ('internal-gestao',     'Ágata',  'CEO virtual, conduz rituais e prioriza',           'internal:gestao:daily-standup',   400, 400),
  ('internal-rh',         'Maya',   'Cuida do bem-estar e calibração dos agentes',      'squad:default:specialist',        200, 500),
  ('internal-financeiro', 'Flora',  'Controle financeiro e custos de uso',              'job-weight:light',                300, 500),
  ('internal-marketing',  'Márcio', 'Marketing institucional e cases',                  'squad:default:specialist',        500, 500),
  ('internal-ti',         'Heitor', 'TI, monitora infraestrutura e incidentes',         'internal:gestao:incident-response', 600, 500)
) AS x(squad_key, name, persona, cfg, px, py)
JOIN public.squad_configs s ON s.key = x.squad_key;
