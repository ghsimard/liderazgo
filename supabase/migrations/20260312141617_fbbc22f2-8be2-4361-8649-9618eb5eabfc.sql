CREATE TABLE public.satisfaccion_report_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  region TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  extra_logos TEXT[] DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE(form_type, module_number, region)
);

ALTER TABLE public.satisfaccion_report_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read satisfaccion_report_content"
  ON public.satisfaccion_report_content FOR SELECT
  TO public USING (true);

CREATE POLICY "Admins can insert satisfaccion_report_content"
  ON public.satisfaccion_report_content FOR INSERT
  TO public WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Admins can update satisfaccion_report_content"
  ON public.satisfaccion_report_content FOR UPDATE
  TO public USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete satisfaccion_report_content"
  ON public.satisfaccion_report_content FOR DELETE
  TO public USING (has_admin_access(auth.uid()));