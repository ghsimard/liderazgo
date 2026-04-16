
CREATE POLICY "Public can read ae_cohorte_instituciones"
ON public.ae_cohorte_instituciones
FOR SELECT
TO public
USING (true);

CREATE POLICY "Public can read ae_cohortes"
ON public.ae_cohortes
FOR SELECT
TO public
USING (true);
