
-- Allow public to read satisfaccion_responses (needed for duplicate check from Mi Panel)
CREATE POLICY "Public can read own satisfaccion_responses"
  ON public.satisfaccion_responses
  FOR SELECT TO public
  USING (true);
