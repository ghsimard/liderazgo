-- Excepciones de mínimos 360° (base de datos de producción - Render)
-- Ejecutar una sola vez. Seguro de re-ejecutar.

CREATE TABLE IF NOT EXISTS public.encuesta_360_excepciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion text NOT NULL UNIQUE,
  sin_estudiantes boolean NOT NULL DEFAULT false,
  sin_administrativos boolean NOT NULL DEFAULT false,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Garantiza la restricción única usada por el guardado (ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.encuesta_360_excepciones'::regclass
      AND contype = 'u'
  ) THEN
    ALTER TABLE public.encuesta_360_excepciones
      ADD CONSTRAINT encuesta_360_excepciones_institucion_key UNIQUE (institucion);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_encuesta_360_excepciones_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encuesta_360_excepciones_updated_at ON public.encuesta_360_excepciones;
CREATE TRIGGER trg_encuesta_360_excepciones_updated_at
BEFORE UPDATE ON public.encuesta_360_excepciones
FOR EACH ROW EXECUTE FUNCTION public.update_encuesta_360_excepciones_updated_at();
