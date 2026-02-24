
CREATE OR REPLACE FUNCTION public.get_directivos_por_institucion(p_nombre_ie text)
RETURNS TABLE(nombres_apellidos text, numero_cedula text, cargo_actual text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT f.nombres_apellidos, f.numero_cedula, f.cargo_actual
  FROM fichas_rlt f
  WHERE f.nombre_ie = p_nombre_ie
    AND f.cargo_actual IN ('Rector/a', 'Coordinador/a')
  ORDER BY f.nombres_apellidos;
$$;
