
-- 1. Create junction table region_entidades
CREATE TABLE public.region_entidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.regiones(id) ON DELETE CASCADE,
  entidad_territorial_id UUID NOT NULL REFERENCES public.entidades_territoriales(id) ON DELETE CASCADE,
  UNIQUE (region_id, entidad_territorial_id)
);

-- 2. Enable RLS
ALTER TABLE public.region_entidades ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies (same pattern as region_municipios)
CREATE POLICY "Public read region_entidades" ON public.region_entidades FOR SELECT USING (true);
CREATE POLICY "Admins can insert region_entidades" ON public.region_entidades FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update region_entidades" ON public.region_entidades FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete region_entidades" ON public.region_entidades FOR DELETE USING (has_admin_access(auth.uid()));

-- 4. Migrate existing data: copy entidad_territorial_id from regiones into the junction table
INSERT INTO public.region_entidades (region_id, entidad_territorial_id)
SELECT id, entidad_territorial_id FROM public.regiones
WHERE entidad_territorial_id IS NOT NULL;

-- 5. Drop the FK constraint and column from regiones
ALTER TABLE public.regiones DROP CONSTRAINT IF EXISTS regiones_entidad_territorial_id_fkey;
ALTER TABLE public.regiones DROP COLUMN entidad_territorial_id;
