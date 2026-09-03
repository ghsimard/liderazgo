-- Trigger: update_rubrica_evaluaciones_updated_at
-- Purpose: automatically set updated_at on every UPDATE to rubrica_evaluaciones
--          for future auditability. Does NOT modify existing data.
-- Date: 2026-09-03

-- 1. Trigger function
CREATE OR REPLACE FUNCTION public.update_rubrica_evaluaciones_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 2. Drop if exists to make idempotent
DROP TRIGGER IF EXISTS rubrica_evaluaciones_updated_at_trigger ON public.rubrica_evaluaciones;

-- 3. Attach trigger
CREATE TRIGGER rubrica_evaluaciones_updated_at_trigger
    BEFORE UPDATE ON public.rubrica_evaluaciones
    FOR EACH ROW
    EXECUTE FUNCTION public.update_rubrica_evaluaciones_updated_at();
