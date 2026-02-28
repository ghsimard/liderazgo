
-- ══════════════════════════════════════════════
-- Module Rubricas: tables principales
-- ══════════════════════════════════════════════

-- 1. Modules (les 4 modules avec titre et objectif)
CREATE TABLE public.rubrica_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_number integer NOT NULL UNIQUE,
  title text NOT NULL,
  objective text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rubrica_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read rubrica_modules" ON public.rubrica_modules FOR SELECT USING (true);
CREATE POLICY "Admins can insert rubrica_modules" ON public.rubrica_modules FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update rubrica_modules" ON public.rubrica_modules FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete rubrica_modules" ON public.rubrica_modules FOR DELETE USING (has_admin_access(auth.uid()));

-- 2. Items par module (proceso/producto avec descriptions de chaque niveau)
CREATE TABLE public.rubrica_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.rubrica_modules(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('PROCESO', 'PRODUCTO')),
  item_label text NOT NULL,
  desc_avanzado text NOT NULL DEFAULT '',
  desc_intermedio text NOT NULL DEFAULT '',
  desc_basico text NOT NULL DEFAULT '',
  desc_sin_evidencia text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rubrica_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read rubrica_items" ON public.rubrica_items FOR SELECT USING (true);
CREATE POLICY "Admins can insert rubrica_items" ON public.rubrica_items FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update rubrica_items" ON public.rubrica_items FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete rubrica_items" ON public.rubrica_items FOR DELETE USING (has_admin_access(auth.uid()));

-- 3. Évaluateurs (gérés par admin)
CREATE TABLE public.rubrica_evaluadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  cedula text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rubrica_evaluadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read rubrica_evaluadores" ON public.rubrica_evaluadores FOR SELECT USING (true);
CREATE POLICY "Admins can insert rubrica_evaluadores" ON public.rubrica_evaluadores FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update rubrica_evaluadores" ON public.rubrica_evaluadores FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete rubrica_evaluadores" ON public.rubrica_evaluadores FOR DELETE USING (has_admin_access(auth.uid()));

-- 4. Assignations évaluateur ↔ directivo
CREATE TABLE public.rubrica_asignaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluador_id uuid NOT NULL REFERENCES public.rubrica_evaluadores(id) ON DELETE CASCADE,
  directivo_cedula text NOT NULL,
  directivo_nombre text NOT NULL,
  institucion text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(evaluador_id, directivo_cedula)
);

ALTER TABLE public.rubrica_asignaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read rubrica_asignaciones" ON public.rubrica_asignaciones FOR SELECT USING (true);
CREATE POLICY "Admins can insert rubrica_asignaciones" ON public.rubrica_asignaciones FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update rubrica_asignaciones" ON public.rubrica_asignaciones FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete rubrica_asignaciones" ON public.rubrica_asignaciones FOR DELETE USING (has_admin_access(auth.uid()));

-- 5. Évaluations principales (auto-éval directivo, équipe locale, accordé)
CREATE TABLE public.rubrica_evaluaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  directivo_cedula text NOT NULL,
  item_id uuid NOT NULL REFERENCES public.rubrica_items(id) ON DELETE CASCADE,
  directivo_nivel text,
  directivo_comentario text,
  equipo_nivel text,
  equipo_comentario text,
  acordado_nivel text,
  acordado_comentario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(directivo_cedula, item_id)
);

ALTER TABLE public.rubrica_evaluaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read rubrica_evaluaciones" ON public.rubrica_evaluaciones FOR SELECT USING (true);
CREATE POLICY "Public can insert rubrica_evaluaciones" ON public.rubrica_evaluaciones FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update rubrica_evaluaciones" ON public.rubrica_evaluaciones FOR UPDATE USING (true);
CREATE POLICY "Admins can delete rubrica_evaluaciones" ON public.rubrica_evaluaciones FOR DELETE USING (has_admin_access(auth.uid()));

-- 6. Suivis / réévaluations dans les modules ultérieurs
CREATE TABLE public.rubrica_seguimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  directivo_cedula text NOT NULL,
  item_id uuid NOT NULL REFERENCES public.rubrica_items(id) ON DELETE CASCADE,
  module_number integer NOT NULL,
  nivel text,
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(directivo_cedula, item_id, module_number)
);

ALTER TABLE public.rubrica_seguimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read rubrica_seguimientos" ON public.rubrica_seguimientos FOR SELECT USING (true);
CREATE POLICY "Public can insert rubrica_seguimientos" ON public.rubrica_seguimientos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update rubrica_seguimientos" ON public.rubrica_seguimientos FOR UPDATE USING (true);
CREATE POLICY "Admins can delete rubrica_seguimientos" ON public.rubrica_seguimientos FOR DELETE USING (has_admin_access(auth.uid()));

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_rubrica_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_rubrica_evaluaciones_updated_at
  BEFORE UPDATE ON public.rubrica_evaluaciones
  FOR EACH ROW EXECUTE FUNCTION public.update_rubrica_updated_at();

CREATE TRIGGER update_rubrica_seguimientos_updated_at
  BEFORE UPDATE ON public.rubrica_seguimientos
  FOR EACH ROW EXECUTE FUNCTION public.update_rubrica_updated_at();
