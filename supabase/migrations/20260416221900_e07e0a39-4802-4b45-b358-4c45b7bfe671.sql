-- New table: ae_campanas
CREATE TABLE public.ae_campanas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cohorte_id UUID NOT NULL REFERENCES public.ae_cohortes(id) ON DELETE CASCADE,
  fase TEXT NOT NULL CHECK (fase IN ('linea_base', 'cierre')),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  nombre TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT ae_campanas_fechas_check CHECK (fecha_fin >= fecha_inicio),
  CONSTRAINT ae_campanas_cohorte_fase_unique UNIQUE (cohorte_id, fase)
);

CREATE INDEX idx_ae_campanas_cohorte ON public.ae_campanas(cohorte_id);
CREATE INDEX idx_ae_campanas_fechas ON public.ae_campanas(fecha_inicio, fecha_fin);

ALTER TABLE public.ae_campanas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read ae_campanas"
  ON public.ae_campanas FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert ae_campanas"
  ON public.ae_campanas FOR INSERT
  WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Admins can update ae_campanas"
  ON public.ae_campanas FOR UPDATE
  USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete ae_campanas"
  ON public.ae_campanas FOR DELETE
  USING (has_admin_access(auth.uid()));

-- Add fase + campana_id to encuestas_ambiente_escolar
ALTER TABLE public.encuestas_ambiente_escolar
  ADD COLUMN fase TEXT,
  ADD COLUMN campana_id UUID REFERENCES public.ae_campanas(id) ON DELETE SET NULL;

CREATE INDEX idx_encuestas_ae_campana ON public.encuestas_ambiente_escolar(campana_id);
CREATE INDEX idx_encuestas_ae_fase ON public.encuestas_ambiente_escolar(fase);