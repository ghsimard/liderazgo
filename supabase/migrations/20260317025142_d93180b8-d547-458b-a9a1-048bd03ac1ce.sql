CREATE POLICY "Viewers can read fichas_rlt"
ON public.fichas_rlt
FOR SELECT
TO authenticated
USING (has_read_access(auth.uid()));