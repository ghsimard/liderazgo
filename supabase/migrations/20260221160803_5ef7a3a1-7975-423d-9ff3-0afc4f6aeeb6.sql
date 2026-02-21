
-- =====================================================
-- Tables de référence géographique
-- =====================================================

-- Entidades territoriales
CREATE TABLE public.entidades_territoriales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.entidades_territoriales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read entidades" ON public.entidades_territoriales FOR SELECT USING (true);
CREATE POLICY "Admins can insert entidades" ON public.entidades_territoriales FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update entidades" ON public.entidades_territoriales FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete entidades" ON public.entidades_territoriales FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Municipios (appartiennent à une entidad)
CREATE TABLE public.municipios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  entidad_territorial_id UUID NOT NULL REFERENCES public.entidades_territoriales(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(nombre, entidad_territorial_id)
);
ALTER TABLE public.municipios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read municipios" ON public.municipios FOR SELECT USING (true);
CREATE POLICY "Admins can insert municipios" ON public.municipios FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update municipios" ON public.municipios FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete municipios" ON public.municipios FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Instituciones (appartiennent à un municipio)
CREATE TABLE public.instituciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  municipio_id UUID NOT NULL REFERENCES public.municipios(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(nombre, municipio_id)
);
ALTER TABLE public.instituciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read instituciones" ON public.instituciones FOR SELECT USING (true);
CREATE POLICY "Admins can insert instituciones" ON public.instituciones FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update instituciones" ON public.instituciones FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete instituciones" ON public.instituciones FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Regiones (regroupement : 1 entidad + municipios sélectionnés)
CREATE TABLE public.regiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  entidad_territorial_id UUID NOT NULL REFERENCES public.entidades_territoriales(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.regiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read regiones" ON public.regiones FOR SELECT USING (true);
CREATE POLICY "Admins can insert regiones" ON public.regiones FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update regiones" ON public.regiones FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete regiones" ON public.regiones FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Table de jonction Région ↔ Municipio
CREATE TABLE public.region_municipios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.regiones(id) ON DELETE CASCADE,
  municipio_id UUID NOT NULL REFERENCES public.municipios(id) ON DELETE CASCADE,
  UNIQUE(region_id, municipio_id)
);
ALTER TABLE public.region_municipios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read region_municipios" ON public.region_municipios FOR SELECT USING (true);
CREATE POLICY "Admins can insert region_municipios" ON public.region_municipios FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update region_municipios" ON public.region_municipios FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete region_municipios" ON public.region_municipios FOR DELETE USING (has_role(auth.uid(), 'admin'));
