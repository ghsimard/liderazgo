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
-- Rubrica tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rubrica_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rubrica_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.rubrica_modules(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_label TEXT NOT NULL,
  desc_avanzado TEXT NOT NULL DEFAULT '',
  desc_intermedio TEXT NOT NULL DEFAULT '',
  desc_basico TEXT NOT NULL DEFAULT '',
  desc_sin_evidencia TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rubrica_evaluadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  cedula TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rubrica_asignaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluador_id UUID NOT NULL REFERENCES public.rubrica_evaluadores(id) ON DELETE CASCADE,
  directivo_cedula TEXT NOT NULL,
  directivo_nombre TEXT NOT NULL,
  institucion TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rubrica_evaluaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.rubrica_items(id) ON DELETE CASCADE,
  directivo_cedula TEXT NOT NULL,
  directivo_nivel TEXT,
  directivo_comentario TEXT,
  equipo_nivel TEXT,
  equipo_comentario TEXT,
  acordado_nivel TEXT,
  acordado_comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rubrica_seguimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.rubrica_items(id) ON DELETE CASCADE,
  directivo_cedula TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  nivel TEXT,
  comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Submission dates tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rubrica_submission_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directivo_cedula TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  submission_type TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (directivo_cedula, module_number, submission_type)
);

CREATE INDEX IF NOT EXISTS idx_rubrica_submission_dates_cedula
  ON public.rubrica_submission_dates(directivo_cedula);

-- ============================================================
-- Regional analyses (persisted AI/admin text per module)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rubrica_regional_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.rubrica_modules(id) ON DELETE CASCADE,
  analysis_text TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE (module_id)
);

-- ============================================================
-- Contact messages (sugerencias / contacto)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  asunto TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  tipo_contacto TEXT NOT NULL DEFAULT 'contacto',
  telefono TEXT,
  codigo_pais TEXT NOT NULL DEFAULT '+57',
  contactar_whatsapp BOOLEAN NOT NULL DEFAULT false,
  rating INTEGER,
  leido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Site reviews (évaluations du site, séparées des sugerencias)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comentario TEXT,
  tipo_formulario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_reviews_created_at ON public.site_reviews(created_at);

-- ============================================================
-- App settings (key-value store)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (key, value)
VALUES ('review_modal_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- SEED: Create initial admin user
-- DO NOT hardcode passwords here. Use the secure setup script:
--   node server/create-admin.js
-- ============================================================
