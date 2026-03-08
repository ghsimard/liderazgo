
-- Add public RLS policies for informe_directivo so evaluators can CRUD
CREATE POLICY "Public can insert informe_directivo" ON public.informe_directivo FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read informe_directivo" ON public.informe_directivo FOR SELECT USING (true);
CREATE POLICY "Public can update informe_directivo" ON public.informe_directivo FOR UPDATE USING (true);
