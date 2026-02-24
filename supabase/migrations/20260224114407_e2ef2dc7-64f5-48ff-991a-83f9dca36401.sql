
-- Fix 1: fichas_rlt - restrict SELECT to admins only
DROP POLICY "Permitir lectura pública" ON public.fichas_rlt;
CREATE POLICY "Admins can read fichas"
  ON public.fichas_rlt FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: encuestas_360 - restrict SELECT to admins only
DROP POLICY "Public can read encuestas_360" ON public.encuestas_360;
CREATE POLICY "Admins can read encuestas_360"
  ON public.encuestas_360 FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
