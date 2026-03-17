
-- Phase 1: Backfill user_custom_roles from legacy user_roles
-- Map legacy roles to custom_roles by name (Admin, Superadmin, Monitoreo)
INSERT INTO user_custom_roles (user_id, role_id)
SELECT ur.user_id, cr.id
FROM user_roles ur
JOIN custom_roles cr ON (
  (ur.role::text = 'admin' AND cr.name = 'Admin')
  OR (ur.role::text = 'superadmin' AND cr.name = 'Superadmin')
  OR (ur.role::text = 'monitoreo' AND cr.name = 'Monitoreo')
)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Phase 2: Rewrite security functions to use user_custom_roles + custom_roles

CREATE OR REPLACE FUNCTION public.has_admin_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_custom_roles ucr
    JOIN public.custom_roles cr ON cr.id = ucr.role_id
    WHERE ucr.user_id = _user_id AND cr.name IN ('Admin', 'Superadmin')
  )
$$;

CREATE OR REPLACE FUNCTION public.has_read_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_custom_roles ucr
    JOIN public.custom_roles cr ON cr.id = ucr.role_id
    WHERE ucr.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_custom_roles ucr
    JOIN public.custom_roles cr ON cr.id = ucr.role_id
    WHERE ucr.user_id = _user_id
    AND (
      (_role::text = 'admin' AND cr.name = 'Admin')
      OR (_role::text = 'superadmin' AND cr.name = 'Superadmin')
      OR (_role::text = 'monitoreo' AND cr.name = 'Monitoreo')
    )
  )
$$;

-- Add unique constraint on user_custom_roles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_custom_roles_user_id_role_id_key'
  ) THEN
    ALTER TABLE user_custom_roles ADD CONSTRAINT user_custom_roles_user_id_role_id_key UNIQUE (user_id, role_id);
  END IF;
END $$;
