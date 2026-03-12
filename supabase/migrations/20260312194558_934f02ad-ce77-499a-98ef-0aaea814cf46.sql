ALTER TABLE public.fichas_rlt ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.update_fichas_rlt_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fichas_rlt_updated_at
  BEFORE UPDATE ON public.fichas_rlt
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fichas_rlt_updated_at();