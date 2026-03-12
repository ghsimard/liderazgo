CREATE TABLE public.satisfaccion_form_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type TEXT NOT NULL UNIQUE,
  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.satisfaccion_form_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read satisfaccion_form_definitions"
  ON public.satisfaccion_form_definitions FOR SELECT
  TO public USING (true);

CREATE POLICY "Admins can insert satisfaccion_form_definitions"
  ON public.satisfaccion_form_definitions FOR INSERT
  TO public WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Admins can update satisfaccion_form_definitions"
  ON public.satisfaccion_form_definitions FOR UPDATE
  TO public USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete satisfaccion_form_definitions"
  ON public.satisfaccion_form_definitions FOR DELETE
  TO public USING (has_admin_access(auth.uid()));