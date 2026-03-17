-- Rename enum value 'auditor' to 'monitoreo'
ALTER TYPE public.app_role RENAME VALUE 'auditor' TO 'monitoreo';

-- Update has_read_access function
CREATE OR REPLACE FUNCTION public.has_read_access(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin', 'superadmin', 'monitoreo')
  )
$$;