CREATE TABLE public.encuesta_360_excepciones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institucion text NOT NULL UNIQUE,
  sin_estudiantes boolean NOT NULL DEFAULT false,
  sin_administrativos boolean NOT NULL DEFAULT false,
  motivo text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.encuesta_360_excepciones TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.encuesta_360_excepciones TO authenticated;
GRANT ALL ON public.encuesta_360_excepciones TO service_role;

ALTER TABLE public.encuesta_360_excepciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Excepciones 360 son visibles para todos"
  ON public.encuesta_360_excepciones FOR SELECT USING (true);

CREATE POLICY "Admins pueden crear excepciones 360"
  ON public.encuesta_360_excepciones FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins pueden actualizar excepciones 360"
  ON public.encuesta_360_excepciones FOR UPDATE TO authenticated
  USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins pueden eliminar excepciones 360"
  ON public.encuesta_360_excepciones FOR DELETE TO authenticated
  USING (public.has_admin_access(auth.uid()));

CREATE TRIGGER trg_encuesta_360_excepciones_updated_at
  BEFORE UPDATE ON public.encuesta_360_excepciones
  FOR EACH ROW EXECUTE FUNCTION public.update_rubrica_updated_at();