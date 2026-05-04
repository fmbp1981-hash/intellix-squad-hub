CREATE TABLE user_roles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'analyst', 'viewer')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  phases jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  client_name text NOT NULL,
  engagement_name text NOT NULL,
  description text,
  template_id uuid REFERENCES templates(id),
  drive_folder_id text,
  drive_folder_url text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE workspace_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index integer NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','active','completed')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE squad_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES workspace_phases(id),
  squad_name text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  state_snapshot jsonb,
  opensquad_run_id text,
  output_markdown text,
  drive_file_id text,
  drive_file_url text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Indexes on high-frequency FK columns (RLS policy subqueries + JOINs)
CREATE INDEX ON workspace_phases (workspace_id);
CREATE INDEX ON squad_runs (workspace_id);
CREATE INDEX ON squad_runs (phase_id);
CREATE INDEX idx_user_roles_user_role ON user_roles (user_id, role);

-- updated_at auto-update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_workspaces" ON workspaces FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all_phases" ON workspace_phases FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all_runs" ON squad_runs FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_self_roles" ON user_roles FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "admin_write_roles" ON user_roles FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all_templates" ON templates FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
