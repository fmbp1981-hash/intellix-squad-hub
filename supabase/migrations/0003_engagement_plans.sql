-- Migration: engagement_plans
-- Orquestrador cross-squad: define a ordem dos squads em um engagement
-- e avança automaticamente (auto_advance) ou aguarda intervenção do operador.

CREATE TABLE engagement_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  -- Exemplo de squads_ordered:
  -- [
  --   {"squad":"rh",         "phase_id":"uuid-fase-1", "depends_on":[]},
  --   {"squad":"financeiro",  "phase_id":"uuid-fase-1", "depends_on":["rh"]},
  --   {"squad":"comercial",   "phase_id":"uuid-fase-2", "depends_on":["rh","financeiro"]}
  -- ]
  squads_ordered  jsonb NOT NULL DEFAULT '[]',
  auto_advance    boolean DEFAULT false,  -- true = avança automaticamente ao completar cada squad
  status          text DEFAULT 'pending'
                    CHECK (status IN ('pending','running','completed','failed','paused')),
  current_squad   text,                  -- squad em execução no momento
  completed_squads jsonb DEFAULT '[]',   -- ["rh", "financeiro"] — para cálculo de progresso
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE engagement_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_engagement_plans" ON engagement_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Realtime para atualizar o painel de engagement sem refresh
ALTER TABLE engagement_plans REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE engagement_plans;

-- Índice: um workspace tem no máximo um plano ativo (enforce via lógica de aplicação)
CREATE INDEX idx_engagement_plans_workspace ON engagement_plans(workspace_id, status);

-- Trigger de updated_at
CREATE TRIGGER engagement_plans_updated_at
  BEFORE UPDATE ON engagement_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
