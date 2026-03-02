DROP FUNCTION IF EXISTS public.get_directivos_por_institucion(text);

CREATE OR REPLACE FUNCTION public.get_directivos_por_institucion(p_nombre_ie text)
RETURNS TABLE(cargo_actual text, nombres_apellidos text, numero_cedula text, genero text)
LANGUAGE sql
STABLE
AS $$
  SELECT cargo_actual, nombres_apellidos, numero_cedula, genero
  FROM fichas_rlt
  WHERE nombre_ie = p_nombre_ie
    AND cargo_actual IN ('Rector/a', 'Coordinador/a')
  ORDER BY nombres_apellidos;
$$;