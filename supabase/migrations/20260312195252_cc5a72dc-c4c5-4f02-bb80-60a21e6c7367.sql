ALTER TABLE public.fichas_rlt ALTER COLUMN updated_at DROP NOT NULL;
UPDATE public.fichas_rlt SET updated_at = NULL;
ALTER TABLE public.fichas_rlt ALTER COLUMN updated_at SET DEFAULT NULL;