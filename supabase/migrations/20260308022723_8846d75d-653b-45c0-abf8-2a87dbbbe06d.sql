-- Allow public insert/update/select on informe_modulo for evaluators
CREATE POLICY "Public can insert informe_modulo"
  ON public.informe_modulo FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update informe_modulo"
  ON public.informe_modulo FOR UPDATE
  USING (true);

CREATE POLICY "Public can read informe_modulo"
  ON public.informe_modulo FOR SELECT
  USING (true);

-- Allow public insert/update/select on informe_modulo_equipo
CREATE POLICY "Public can insert informe_modulo_equipo"
  ON public.informe_modulo_equipo FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update informe_modulo_equipo"
  ON public.informe_modulo_equipo FOR UPDATE
  USING (true);

CREATE POLICY "Public can read informe_modulo_equipo"
  ON public.informe_modulo_equipo FOR SELECT
  USING (true);

CREATE POLICY "Public can delete informe_modulo_equipo"
  ON public.informe_modulo_equipo FOR DELETE
  USING (true);