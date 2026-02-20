-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. RLS policies on user_roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 5. Allow admins to UPDATE fichas_rlt
CREATE POLICY "Admins can update fichas"
  ON public.fichas_rlt FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Allow admins to DELETE fichas_rlt
CREATE POLICY "Admins can delete fichas"
  ON public.fichas_rlt FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));