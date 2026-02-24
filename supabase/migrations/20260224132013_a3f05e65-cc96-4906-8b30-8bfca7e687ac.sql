
CREATE OR REPLACE FUNCTION public.get_instituciones_con_ficha()
RETURNS TABLE(nombre_ie text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT DISTINCT f.nombre_ie
  FROM fichas_rlt f
  ORDER BY f.nombre_ie;
$$;
