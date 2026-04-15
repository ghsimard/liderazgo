
-- Table: ae_cohortes
CREATE TABLE public.ae_cohortes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  entidad_territorial text NOT NULL,
  year integer NOT NULL,
  grupo integer NOT NULL DEFAULT 1,
  is_baseline boolean NOT NULL DEFAULT true,
  fecha_inicio date,
  fecha_certificacion date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entidad_territorial, year, grupo)
);

ALTER TABLE public.ae_cohortes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ae_cohortes" ON public.ae_cohortes FOR SELECT USING (has_admin_access(auth.uid()));
CREATE POLICY "Viewers can read ae_cohortes" ON public.ae_cohortes FOR SELECT TO authenticated USING (has_read_access(auth.uid()));
CREATE POLICY "Admins can insert ae_cohortes" ON public.ae_cohortes FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update ae_cohortes" ON public.ae_cohortes FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete ae_cohortes" ON public.ae_cohortes FOR DELETE USING (has_admin_access(auth.uid()));

-- Table: ae_cohorte_instituciones
CREATE TABLE public.ae_cohorte_instituciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohorte_id uuid NOT NULL REFERENCES public.ae_cohortes(id) ON DELETE CASCADE,
  institucion_educativa text NOT NULL,
  UNIQUE(cohorte_id, institucion_educativa)
);

ALTER TABLE public.ae_cohorte_instituciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ae_cohorte_instituciones" ON public.ae_cohorte_instituciones FOR SELECT USING (has_admin_access(auth.uid()));
CREATE POLICY "Viewers can read ae_cohorte_instituciones" ON public.ae_cohorte_instituciones FOR SELECT TO authenticated USING (has_read_access(auth.uid()));
CREATE POLICY "Admins can insert ae_cohorte_instituciones" ON public.ae_cohorte_instituciones FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update ae_cohorte_instituciones" ON public.ae_cohorte_instituciones FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete ae_cohorte_instituciones" ON public.ae_cohorte_instituciones FOR DELETE USING (has_admin_access(auth.uid()));

-- ALTER encuestas_ambiente_escolar
ALTER TABLE public.encuestas_ambiente_escolar
  ADD COLUMN cohorte_id uuid REFERENCES public.ae_cohortes(id),
  ADD COLUMN entidad_territorial text;
