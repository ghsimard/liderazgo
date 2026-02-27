-- ============================================================
-- SCHEMA: Users & Roles for Render (PostgreSQL standard)
-- Replaces Supabase Auth
-- ============================================================

-- 1. Users table (replaces auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sign_in_at TIMESTAMPTZ
);

-- Add column if table already exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

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

-- 6. Region ↔ Entidad junction table (only if core geography tables exist)
DO $$
BEGIN
  IF to_regclass('public.regiones') IS NOT NULL
     AND to_regclass('public.entidades_territoriales') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS public.region_entidades (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      region_id UUID NOT NULL REFERENCES public.regiones(id) ON DELETE CASCADE,
      entidad_territorial_id UUID NOT NULL REFERENCES public.entidades_territoriales(id) ON DELETE CASCADE,
      UNIQUE (region_id, entidad_territorial_id)
    );

    CREATE INDEX IF NOT EXISTS idx_region_entidades_region_id
      ON public.region_entidades(region_id);
    CREATE INDEX IF NOT EXISTS idx_region_entidades_entidad_id
      ON public.region_entidades(entidad_territorial_id);
  END IF;
END $$;

-- Optional backfill when region_municipios + municipios already contain data
DO $$
BEGIN
  IF to_regclass('public.region_entidades') IS NOT NULL
     AND to_regclass('public.region_municipios') IS NOT NULL
     AND to_regclass('public.municipios') IS NOT NULL THEN
    INSERT INTO public.region_entidades (region_id, entidad_territorial_id)
    SELECT DISTINCT rm.region_id, m.entidad_territorial_id
    FROM public.region_municipios rm
    JOIN public.municipios m ON m.id = rm.municipio_id
    LEFT JOIN public.region_entidades re
      ON re.region_id = rm.region_id
     AND re.entidad_territorial_id = m.entidad_territorial_id
    WHERE re.id IS NULL;
  END IF;
END $$;

-- ============================================================
-- Deleted records (trash / papelera)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.deleted_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type TEXT NOT NULL,
  record_label TEXT NOT NULL,
  deleted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_deleted_records_type ON public.deleted_records (record_type);

-- ============================================================
-- SEED: Create initial admin user
-- DO NOT hardcode passwords here. Use the secure setup script:
--   node server/create-admin.js
-- ============================================================
