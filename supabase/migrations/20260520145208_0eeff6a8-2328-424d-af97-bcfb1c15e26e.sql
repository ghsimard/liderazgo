ALTER TABLE public.satisfaccion_form_definitions
  ADD COLUMN IF NOT EXISTS module_number INTEGER;

ALTER TABLE public.satisfaccion_form_definitions
  DROP CONSTRAINT IF EXISTS satisfaccion_form_definitions_form_type_key;

CREATE UNIQUE INDEX IF NOT EXISTS satisfaccion_form_definitions_type_module_key
  ON public.satisfaccion_form_definitions (form_type, COALESCE(module_number, -1));