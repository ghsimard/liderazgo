-- Historial de cambios de nombre de instituciones
-- Ejecutar manualmente en la base de datos de producción.
-- No modifica ningún dato existente.

CREATE TABLE IF NOT EXISTS public.institucion_renames (
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

CREATE INDEX IF NOT EXISTS idx_institucion_renames_created_at
  ON public.institucion_renames (created_at DESC);

-- Verificación
-- SELECT * FROM public.institucion_renames ORDER BY created_at DESC LIMIT 10;

-- Undo (elimina la tabla y su historial)
-- DROP TABLE IF EXISTS public.institucion_renames;
