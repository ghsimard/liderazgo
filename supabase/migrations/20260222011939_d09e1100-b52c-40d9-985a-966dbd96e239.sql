
-- Table to store 360° survey responses
CREATE TABLE public.encuestas_360 (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  tipo_formulario text NOT NULL CHECK (tipo_formulario IN ('docente', 'estudiante', 'directivo', 'acudiente', 'autoevaluacion', 'administrativo')),
  
  -- Common fields
  institucion_educativa text NOT NULL,
  cargo_directivo text NOT NULL CHECK (cargo_directivo IN ('Rector/a', 'Coordinador/a')),
  
  -- Fields for non-autoevaluacion forms
  nombre_directivo text,
  cedula_directivo text,
  dias_contacto text,
  
  -- Estudiante-specific
  grado_estudiante text,
  
  -- Directivo-specific
  cargo_evaluador text,
  
  -- Autoevaluacion-specific
  nombre_completo text,
  cedula text,
  
  -- All 39 answers stored as JSONB: {"1": "Nunca", "2": "Siempre", ...}
  respuestas jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.encuestas_360 ENABLE ROW LEVEL SECURITY;

-- Public can insert (anyone can fill in a survey)
CREATE POLICY "Public can insert encuestas_360"
ON public.encuestas_360
FOR INSERT
WITH CHECK (true);

-- Public can read (for confirmation)
CREATE POLICY "Public can read encuestas_360"
ON public.encuestas_360
FOR SELECT
USING (true);

-- Only admins can update
CREATE POLICY "Admins can update encuestas_360"
ON public.encuestas_360
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete encuestas_360"
ON public.encuestas_360
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
