-- ============================================================
-- SCHEMA: Users & Roles for Render (PostgreSQL standard)
-- Replaces Supabase Auth
-- ============================================================

-- 1. Users table (replaces auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- 2. Roles enum (keep existing if already created by export)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'superadmin');
EXCEPTION WHEN duplicate_object THEN
  -- Add superadmin if enum exists but doesn't have it
  BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- 3. User roles table (same structure as current)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 4. has_role function (simplified — no more RLS context)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. App images table (same structure, storage_path = relative URL)
CREATE TABLE IF NOT EXISTS public.app_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_key TEXT UNIQUE NOT NULL,
  storage_path TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.users(id)
);

-- ============================================================
-- SEED: Create initial admin user
-- Password: "admin123" (CHANGE THIS IMMEDIATELY)
-- Hash generated with bcrypt, 12 rounds
-- ============================================================
-- To generate a new hash:
--   node -e "require('bcryptjs').hash('YOUR_PASSWORD', 12).then(console.log)"
--
-- INSERT INTO public.users (id, email, password_hash)
-- VALUES (
--   gen_random_uuid(),
--   'admin@example.com',
--   '$2a$12$REPLACE_WITH_BCRYPT_HASH'
-- );
--
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'admin' FROM public.users WHERE email = 'admin@example.com';
