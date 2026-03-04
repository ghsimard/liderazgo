
CREATE OR REPLACE FUNCTION public.get_own_autoevaluacion(p_cedula text, p_fase text DEFAULT 'inicial'::text)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_to_json(t) FROM (
    SELECT id, respuestas, created_at, tipo_formulario, fase,
           institucion_educativa, cargo_directivo, nombre_directivo
    FROM public.encuestas_360
    WHERE (cedula_directivo = p_cedula OR cedula = p_cedula)
      AND tipo_formulario = 'autoevaluacion'
      AND fase = p_fase
    ORDER BY created_at DESC
    LIMIT 1
  ) t;
$$;
