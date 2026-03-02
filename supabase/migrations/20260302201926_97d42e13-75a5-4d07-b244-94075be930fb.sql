
-- Create a SECURITY DEFINER function to fetch a single ficha by cedula
-- This avoids opening public SELECT on fichas_rlt (which contains PII)
CREATE OR REPLACE FUNCTION public.get_ficha_by_cedula(p_cedula text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(f.*)
  FROM fichas_rlt f
  WHERE f.numero_cedula = p_cedula
  LIMIT 1;
$$;
