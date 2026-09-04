CREATE TABLE public.institucion_renames (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  old_name text NOT NULL,
  new_name text NOT NULL,
  changed_by_cedula text,
  changed_by_nombre text,
  counts jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_rows integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aplicado',
  reverted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.institucion_renames TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.institucion_renames TO anon;
GRANT ALL ON public.institucion_renames TO service_role;

ALTER TABLE public.institucion_renames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read institucion renames"
  ON public.institucion_renames FOR SELECT USING (true);

CREATE POLICY "Anyone can insert institucion renames"
  ON public.institucion_renames FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update institucion renames"
  ON public.institucion_renames FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Admins can delete institucion renames"
  ON public.institucion_renames FOR DELETE TO authenticated
  USING (public.has_admin_access(auth.uid()));

CREATE INDEX idx_institucion_renames_created_at ON public.institucion_renames (created_at DESC);