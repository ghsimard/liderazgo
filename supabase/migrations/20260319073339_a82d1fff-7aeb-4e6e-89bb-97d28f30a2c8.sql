
-- Create helper function to check Superadmin status
CREATE OR REPLACE FUNCTION public.has_superadmin_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_custom_roles ucr
    JOIN public.custom_roles cr ON cr.id = ucr.role_id
    WHERE ucr.user_id = _user_id AND cr.name = 'Superadmin'
  )
$$;

-- Drop existing policies on role_permissions that allow any admin to mutate
DROP POLICY IF EXISTS "Admins can insert role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can update role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can delete role_permissions" ON public.role_permissions;

-- Recreate with Superadmin protection: admins can mutate non-Superadmin role perms, only superadmins can mutate Superadmin role perms
CREATE POLICY "Admins can insert role_permissions" ON public.role_permissions
  FOR INSERT TO public
  WITH CHECK (
    has_admin_access(auth.uid()) AND (
      NOT EXISTS (SELECT 1 FROM public.custom_roles cr WHERE cr.id = role_id AND cr.name = 'Superadmin')
      OR has_superadmin_access(auth.uid())
    )
  );

CREATE POLICY "Admins can update role_permissions" ON public.role_permissions
  FOR UPDATE TO public
  USING (
    has_admin_access(auth.uid()) AND (
      NOT EXISTS (SELECT 1 FROM public.custom_roles cr WHERE cr.id = role_id AND cr.name = 'Superadmin')
      OR has_superadmin_access(auth.uid())
    )
  );

CREATE POLICY "Admins can delete role_permissions" ON public.role_permissions
  FOR DELETE TO public
  USING (
    has_admin_access(auth.uid()) AND (
      NOT EXISTS (SELECT 1 FROM public.custom_roles cr WHERE cr.id = role_id AND cr.name = 'Superadmin')
      OR has_superadmin_access(auth.uid())
    )
  );

-- Protect custom_roles: prevent non-superadmins from modifying/deleting the Superadmin role
DROP POLICY IF EXISTS "Admins can update custom_roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Admins can delete custom_roles" ON public.custom_roles;

CREATE POLICY "Admins can update custom_roles" ON public.custom_roles
  FOR UPDATE TO public
  USING (
    has_admin_access(auth.uid()) AND (
      name != 'Superadmin' OR has_superadmin_access(auth.uid())
    )
  );

CREATE POLICY "Admins can delete custom_roles" ON public.custom_roles
  FOR DELETE TO public
  USING (
    has_admin_access(auth.uid()) AND (
      name != 'Superadmin' OR has_superadmin_access(auth.uid())
    )
  );
