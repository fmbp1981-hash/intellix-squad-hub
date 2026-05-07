
CREATE TABLE IF NOT EXISTS public.drive_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'root',
  scope_id UUID NULL,
  folder_id TEXT NOT NULL,
  folder_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.drive_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view drive settings"
  ON public.drive_settings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert drive settings"
  ON public.drive_settings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update drive settings"
  ON public.drive_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete drive settings"
  ON public.drive_settings FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
