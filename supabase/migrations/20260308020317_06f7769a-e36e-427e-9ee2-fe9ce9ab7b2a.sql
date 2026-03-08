
-- Attendance tracking per directivo per module
CREATE TABLE public.informe_asistencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  directivo_cedula text NOT NULL,
  module_number integer NOT NULL,
  dia integer NOT NULL CHECK (dia BETWEEN 1 AND 5),
  session_am boolean NOT NULL DEFAULT false,
  session_pm boolean NOT NULL DEFAULT false,
  razon_inasistencia text,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (directivo_cedula, module_number, dia)
);

ALTER TABLE public.informe_asistencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read informe_asistencia" ON public.informe_asistencia FOR SELECT USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can insert informe_asistencia" ON public.informe_asistencia FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update informe_asistencia" ON public.informe_asistencia FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete informe_asistencia" ON public.informe_asistencia FOR DELETE USING (has_admin_access(auth.uid()));

-- Main module report per module + region + ET
CREATE TABLE public.informe_modulo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_number integer NOT NULL,
  region text NOT NULL,
  entidad_territorial text NOT NULL,
  fecha_inicio_intensivo date,
  fecha_fin_intensivo date,
  fecha_inicio_interludio date,
  fecha_fin_interludio date,
  aprendizajes_intensivo text DEFAULT '',
  ajustes_actividades jsonb DEFAULT '[]'::jsonb,
  articulacion_intensivo text DEFAULT '',
  sesiones_programadas jsonb DEFAULT '{}'::jsonb,
  sesiones_realizadas jsonb DEFAULT '{}'::jsonb,
  razones_diferencias text DEFAULT '',
  acompanamiento_descripcion text DEFAULT '',
  acompanamiento_no_cumplido text DEFAULT '',
  acompanamiento_directivos jsonb DEFAULT '[]'::jsonb,
  estrategias jsonb DEFAULT '[]'::jsonb,
  aprendizajes_interludio text DEFAULT '',
  articulacion_interludio text DEFAULT '',
  contexto_plan_sectorial text DEFAULT '',
  contexto_articulacion text DEFAULT '',
  novedades jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_number, region, entidad_territorial)
);

ALTER TABLE public.informe_modulo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read informe_modulo" ON public.informe_modulo FOR SELECT USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can insert informe_modulo" ON public.informe_modulo FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update informe_modulo" ON public.informe_modulo FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete informe_modulo" ON public.informe_modulo FOR DELETE USING (has_admin_access(auth.uid()));

-- Team members for each report
CREATE TABLE public.informe_modulo_equipo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  informe_id uuid NOT NULL REFERENCES public.informe_modulo(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  rol text NOT NULL
);

ALTER TABLE public.informe_modulo_equipo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read informe_modulo_equipo" ON public.informe_modulo_equipo FOR SELECT USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can insert informe_modulo_equipo" ON public.informe_modulo_equipo FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update informe_modulo_equipo" ON public.informe_modulo_equipo FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete informe_modulo_equipo" ON public.informe_modulo_equipo FOR DELETE USING (has_admin_access(auth.uid()));

-- Individual directivo evaluation per module (feuille DD)
CREATE TABLE public.informe_directivo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  informe_id uuid REFERENCES public.informe_modulo(id) ON DELETE CASCADE,
  directivo_cedula text NOT NULL,
  module_number integer NOT NULL,
  reto_estrategico text DEFAULT '',
  razon_sin_reto text DEFAULT '',
  avances_personal text DEFAULT '',
  retos_personal text DEFAULT '',
  avances_pedagogica text DEFAULT '',
  retos_pedagogica text DEFAULT '',
  avances_administrativa text DEFAULT '',
  retos_administrativa text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (directivo_cedula, module_number)
);

ALTER TABLE public.informe_directivo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read informe_directivo" ON public.informe_directivo FOR SELECT USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can insert informe_directivo" ON public.informe_directivo FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update informe_directivo" ON public.informe_directivo FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete informe_directivo" ON public.informe_directivo FOR DELETE USING (has_admin_access(auth.uid()));
