
-- Table: custom roles
CREATE TABLE public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read custom_roles" ON public.custom_roles FOR SELECT USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can insert custom_roles" ON public.custom_roles FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update custom_roles" ON public.custom_roles FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete custom_roles" ON public.custom_roles FOR DELETE USING (has_admin_access(auth.uid()));
CREATE POLICY "Viewers can read custom_roles" ON public.custom_roles FOR SELECT TO authenticated USING (has_read_access(auth.uid()));

-- Table: role permissions (section × CRUD)
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  section text NOT NULL,
  can_create boolean DEFAULT false,
  can_read boolean DEFAULT true,
  can_update boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  UNIQUE(role_id, section)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read role_permissions" ON public.role_permissions FOR SELECT USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can insert role_permissions" ON public.role_permissions FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update role_permissions" ON public.role_permissions FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete role_permissions" ON public.role_permissions FOR DELETE USING (has_admin_access(auth.uid()));
CREATE POLICY "Viewers can read role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (has_read_access(auth.uid()));

-- Table: user ↔ custom role assignment
CREATE TABLE public.user_custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id)
);

ALTER TABLE public.user_custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read user_custom_roles" ON public.user_custom_roles FOR SELECT USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can insert user_custom_roles" ON public.user_custom_roles FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update user_custom_roles" ON public.user_custom_roles FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete user_custom_roles" ON public.user_custom_roles FOR DELETE USING (has_admin_access(auth.uid()));
CREATE POLICY "Users can read own custom_roles" ON public.user_custom_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Viewers can read user_custom_roles" ON public.user_custom_roles FOR SELECT TO authenticated USING (has_read_access(auth.uid()));

-- Security definer function to get user permissions (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS TABLE(section text, can_create boolean, can_read boolean, can_update boolean, can_delete boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT rp.section, 
    bool_or(rp.can_create) as can_create,
    bool_or(rp.can_read) as can_read,
    bool_or(rp.can_update) as can_update,
    bool_or(rp.can_delete) as can_delete
  FROM user_custom_roles ucr
  JOIN role_permissions rp ON rp.role_id = ucr.role_id
  WHERE ucr.user_id = _user_id
  GROUP BY rp.section;
$$;
