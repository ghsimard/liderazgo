
-- 1. Add cedula column to user_roles-related users table
-- Since we use auth.users on Supabase, we need a profile-like mapping
-- Create a table to link admin cedulas to auth user IDs
-- (We can't add columns to auth.users directly)

-- Actually, let's check: the project has no profiles table.
-- The memory says "Champ cedula dans users" but on Supabase we can't modify auth.users.
-- So we create an admin_cedulas linking table.

CREATE TABLE IF NOT EXISTS public.admin_cedulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  cedula TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_cedulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read admin_cedulas"
  ON public.admin_cedulas FOR SELECT
  USING (has_admin_access(auth.uid()));

CREATE POLICY "Superadmins can insert admin_cedulas"
  ON public.admin_cedulas FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can update admin_cedulas"
  ON public.admin_cedulas FOR UPDATE
  USING (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can delete admin_cedulas"
  ON public.admin_cedulas FOR DELETE
  USING (has_role(auth.uid(), 'superadmin'));

-- 2. RPC function to check cedula role from the landing page
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
    'cargo_actual', (SELECT cargo_actual FROM fichas_rlt WHERE numero_cedula = p_cedula LIMIT 1),
    'nombre', (SELECT nombres_apellidos FROM fichas_rlt WHERE numero_cedula = p_cedula LIMIT 1)
  );
$$;
