-- Rename enum value 'viewer' to 'auditor'
ALTER TYPE public.app_role RENAME VALUE 'viewer' TO 'auditor';

-- Update has_read_access function to use 'auditor'
CREATE OR REPLACE FUNCTION public.has_read_access(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin', 'superadmin', 'auditor')
  )
$$;