ALTER TABLE public.encuestas_360 ADD COLUMN IF NOT EXISTS fase TEXT NOT NULL DEFAULT 'inicial';

CREATE INDEX IF NOT EXISTS idx_encuestas_360_fase ON public.encuestas_360(fase);