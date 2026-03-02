
CREATE OR REPLACE FUNCTION public.check_cedula_role(p_cedula text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'exists_ficha', EXISTS (SELECT 1 FROM fichas_rlt WHERE numero_cedula = p_cedula),
    'is_admin', EXISTS (SELECT 1 FROM admin_cedulas WHERE cedula = p_cedula),
    'is_directivo', EXISTS (
      SELECT 1 FROM fichas_rlt
      WHERE numero_cedula = p_cedula
        AND cargo_actual IN ('Rector/a', 'Coordinador/a')
    ),
    'is_evaluador', EXISTS (SELECT 1 FROM rubrica_evaluadores WHERE cedula = p_cedula),
    'cargo_actual', (SELECT cargo_actual FROM fichas_rlt WHERE numero_cedula = p_cedula LIMIT 1),
    'nombre', (SELECT nombres_apellidos FROM fichas_rlt WHERE numero_cedula = p_cedula LIMIT 1),
    'genero', (SELECT genero FROM fichas_rlt WHERE numero_cedula = p_cedula LIMIT 1)
  );
$$;
