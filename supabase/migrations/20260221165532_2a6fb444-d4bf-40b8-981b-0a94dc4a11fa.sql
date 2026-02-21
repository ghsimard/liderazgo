
-- Join table to associate instituciones to regions
CREATE TABLE public.region_instituciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region_id UUID NOT NULL REFERENCES public.regiones(id) ON DELETE CASCADE,
  institucion_id UUID NOT NULL REFERENCES public.instituciones(id) ON DELETE CASCADE,
  UNIQUE(region_id, institucion_id)
);

ALTER TABLE public.region_instituciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read region_instituciones" ON public.region_instituciones FOR SELECT USING (true);
CREATE POLICY "Admins can insert region_instituciones" ON public.region_instituciones FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update region_instituciones" ON public.region_instituciones FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete region_instituciones" ON public.region_instituciones FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
