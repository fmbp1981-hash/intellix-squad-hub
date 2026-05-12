-- Migration: squad_checkpoints
-- Suporta o fluxo de checkpoint humano na pipeline de squads de consultoria.
-- O VPS pausa quando state.status='checkpoint' e faz polling nesta tabela a cada 10s.

CREATE TABLE squad_checkpoints (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       uuid REFERENCES squad_runs(id) ON DELETE CASCADE NOT NULL,
  step_label   text NOT NULL,       -- ex: "Aprovação do Diagnóstico"
  step_index   integer NOT NULL,    -- índice do step que gerou o checkpoint
  context_md   text,                -- sumário do diagnóstico para o operador revisar
  status       text DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  resolved_by  uuid REFERENCES auth.users(id),
  resolved_at  timestamptz,
  notes        text,                -- comentário opcional do operador ao resolver
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE squad_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_checkpoints" ON squad_checkpoints
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Realtime: o frontend subscreve para exibir/ocultar o banner de checkpoint em tempo real
ALTER TABLE squad_checkpoints REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE squad_checkpoints;

-- Índice para o polling do VPS (busca por run_id + status)
CREATE INDEX idx_squad_checkpoints_run_status
  ON squad_checkpoints(run_id, status);
