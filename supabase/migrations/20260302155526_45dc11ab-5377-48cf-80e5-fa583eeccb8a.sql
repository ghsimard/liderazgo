-- Function to check if a cedula already exists in fichas_rlt (public access)
CREATE OR REPLACE FUNCTION public.check_cedula_exists(p_cedula text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.fichas_rlt
    WHERE numero_cedula = p_cedula
  )
$$;