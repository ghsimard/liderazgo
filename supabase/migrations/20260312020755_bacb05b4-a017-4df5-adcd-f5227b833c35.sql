
CREATE TABLE public.encuestas_ambiente_escolar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tipo_formulario TEXT NOT NULL,
  institucion_educativa TEXT NOT NULL,
  respuestas JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.encuestas_ambiente_escolar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert encuestas_ambiente_escolar"
  ON public.encuestas_ambiente_escolar
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can read encuestas_ambiente_escolar"
  ON public.encuestas_ambiente_escolar
  FOR SELECT
  TO public
  USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete encuestas_ambiente_escolar"
  ON public.encuestas_ambiente_escolar
  FOR DELETE
  TO public
  USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can update encuestas_ambiente_escolar"
  ON public.encuestas_ambiente_escolar
  FOR UPDATE
  TO public
  USING (has_admin_access(auth.uid()));
