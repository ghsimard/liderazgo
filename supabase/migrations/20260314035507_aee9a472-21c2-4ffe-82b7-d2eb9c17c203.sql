-- 1. Create operator_permissions table
CREATE TABLE IF NOT EXISTS public.operator_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula TEXT NOT NULL,
  nombre TEXT NOT NULL DEFAULT '',
  section TEXT NOT NULL,
  region TEXT,
  entidad TEXT,
  institucion TEXT,
  module_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operator_permissions_cedula
  ON public.operator_permissions(cedula);

-- 2. RLS
ALTER TABLE public.operator_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read operator_permissions"
  ON public.operator_permissions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can insert operator_permissions"
  ON public.operator_permissions FOR INSERT
  TO public
  WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Admins can update operator_permissions"
  ON public.operator_permissions FOR UPDATE
  TO public
  USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete operator_permissions"
  ON public.operator_permissions FOR DELETE
  TO public
  USING (has_admin_access(auth.uid()));

-- 3. Update check_cedula_role to include is_operator
CREATE OR REPLACE FUNCTION public.check_cedula_role(p_cedula text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'exists_ficha', EXISTS (SELECT 1 FROM fichas_rlt WHERE numero_cedula = p_cedula),
    'is_admin', EXISTS (SELECT 1 FROM admin_cedulas WHERE cedula = p_cedula),
    'is_directivo', EXISTS (
      SELECT 1 FROM fichas_rlt
      WHERE numero_cedula = p_cedula
        AND cargo_actual IN ('Rector/a', 'Coordinador/a')
    ),
    'is_evaluador', EXISTS (SELECT 1 FROM rubrica_evaluadores WHERE cedula = p_cedula),
    'is_operator', EXISTS (SELECT 1 FROM operator_permissions WHERE cedula = p_cedula),
    'cargo_actual', (SELECT cargo_actual FROM fichas_rlt WHERE numero_cedula = p_cedula LIMIT 1),
    'nombre', COALESCE(
      (SELECT nombres_apellidos FROM fichas_rlt WHERE numero_cedula = p_cedula LIMIT 1),
      (SELECT nombre FROM rubrica_evaluadores WHERE cedula = p_cedula LIMIT 1)
    ),
    'genero', (SELECT genero FROM fichas_rlt WHERE numero_cedula = p_cedula LIMIT 1)
  );
$$;