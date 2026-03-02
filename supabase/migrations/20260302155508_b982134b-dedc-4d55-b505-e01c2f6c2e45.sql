-- Add unique constraint on numero_cedula (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_fichas_rlt_numero_cedula_unique 
ON public.fichas_rlt (numero_cedula) 
WHERE numero_cedula IS NOT NULL;