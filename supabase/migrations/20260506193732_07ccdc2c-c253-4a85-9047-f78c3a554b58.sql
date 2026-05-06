
-- drive_setup
CREATE TABLE public.drive_setup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'none',
  root_folder_id text,
  root_folder_url text,
  auto_create_folders boolean NOT NULL DEFAULT true,
  folder_template jsonb NOT NULL DEFAULT '{}'::jsonb,
  connected_by uuid,
  connected_at timestamptz,
  status text NOT NULL DEFAULT 'disconnected',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider)
);

ALTER TABLE public.drive_setup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drive_setup admin all" ON public.drive_setup
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "drive_setup read authenticated" ON public.drive_setup
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER drive_setup_updated_at
  BEFORE UPDATE ON public.drive_setup
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- export_run
CREATE TABLE public.export_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL,
  entity_type text NOT NULL,
  format text NOT NULL DEFAULT 'csv',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  row_count int,
  file_url text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.export_run ENABLE ROW LEVEL SECURITY;

CREATE POLICY "export_run owner select" ON public.export_run
  FOR SELECT TO authenticated
  USING (requested_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "export_run owner insert" ON public.export_run
  FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "export_run admin update" ON public.export_run
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_export_run_requested_by ON public.export_run(requested_by, created_at DESC);

-- exports bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('exports', 'exports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "exports user read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "exports user insert own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exports' AND auth.uid()::text = (storage.foldername(name))[1]);
