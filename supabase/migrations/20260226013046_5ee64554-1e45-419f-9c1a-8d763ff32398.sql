
-- Helper: check if user has admin OR superadmin role
CREATE OR REPLACE FUNCTION public.has_admin_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'superadmin')
  )
$$;

-- Update all admin RLS policies to use has_admin_access instead of has_role(..., 'admin')

-- fichas_rlt
DROP POLICY IF EXISTS "Admins can read fichas" ON public.fichas_rlt;
CREATE POLICY "Admins can read fichas" ON public.fichas_rlt FOR SELECT USING (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can update fichas" ON public.fichas_rlt;
CREATE POLICY "Admins can update fichas" ON public.fichas_rlt FOR UPDATE USING (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete fichas" ON public.fichas_rlt;
CREATE POLICY "Admins can delete fichas" ON public.fichas_rlt FOR DELETE USING (has_admin_access(auth.uid()));

-- encuestas_360
DROP POLICY IF EXISTS "Admins can read encuestas_360" ON public.encuestas_360;
CREATE POLICY "Admins can read encuestas_360" ON public.encuestas_360 FOR SELECT USING (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can update encuestas_360" ON public.encuestas_360;
CREATE POLICY "Admins can update encuestas_360" ON public.encuestas_360 FOR UPDATE USING (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete encuestas_360" ON public.encuestas_360;
CREATE POLICY "Admins can delete encuestas_360" ON public.encuestas_360 FOR DELETE USING (has_admin_access(auth.uid()));

-- deleted_records
DROP POLICY IF EXISTS "Admins can read deleted_records" ON public.deleted_records;
CREATE POLICY "Admins can read deleted_records" ON public.deleted_records FOR SELECT USING (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can insert deleted_records" ON public.deleted_records;
CREATE POLICY "Admins can insert deleted_records" ON public.deleted_records FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete deleted_records" ON public.deleted_records;
CREATE POLICY "Admins can delete deleted_records" ON public.deleted_records FOR DELETE USING (has_admin_access(auth.uid()));

-- app_images
DROP POLICY IF EXISTS "Admins can insert app_images" ON public.app_images;
CREATE POLICY "Admins can insert app_images" ON public.app_images FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can update app_images" ON public.app_images;
CREATE POLICY "Admins can update app_images" ON public.app_images FOR UPDATE USING (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete app_images" ON public.app_images;
CREATE POLICY "Admins can delete app_images" ON public.app_images FOR DELETE USING (has_admin_access(auth.uid()));

-- domains_360
DROP POLICY IF EXISTS "Admins can insert domains_360" ON public.domains_360;
CREATE POLICY "Admins can insert domains_360" ON public.domains_360 FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can update domains_360" ON public.domains_360;
CREATE POLICY "Admins can update domains_360" ON public.domains_360 FOR UPDATE USING (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete domains_360" ON public.domains_360;
CREATE POLICY "Admins can delete domains_360" ON public.domains_360 FOR DELETE USING (has_admin_access(auth.uid()));

-- competencies_360
DROP POLICY IF EXISTS "Admins can insert competencies_360" ON public.competencies_360;
CREATE POLICY "Admins can insert competencies_360" ON public.competencies_360 FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can update competencies_360" ON public.competencies_360;
CREATE POLICY "Admins can update competencies_360" ON public.competencies_360 FOR UPDATE USING (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete competencies_360" ON public.competencies_360;
CREATE POLICY "Admins can delete competencies_360" ON public.competencies_360 FOR DELETE USING (has_admin_access(auth.uid()));

-- competency_weights
DROP POLICY IF EXISTS "Admins can insert weights" ON public.competency_weights;
CREATE POLICY "Admins can insert weights" ON public.competency_weights FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can update weights" ON public.competency_weights;
CREATE POLICY "Admins can update weights" ON public.competency_weights FOR UPDATE USING (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete weights" ON public.competency_weights;
CREATE POLICY "Admins can delete weights" ON public.competency_weights FOR DELETE USING (has_admin_access(auth.uid()));

-- items_360
DROP POLICY IF EXISTS "Admins can insert items_360" ON public.items_360;
CREATE POLICY "Admins can insert items_360" ON public.items_360 FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can update items_360" ON public.items_360;
CREATE POLICY "Admins can update items_360" ON public.items_360 FOR UPDATE USING (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete items_360" ON public.items_360;
CREATE POLICY "Admins can delete items_360" ON public.items_360 FOR DELETE USING (has_admin_access(auth.uid()));

-- item_texts_360
DROP POLICY IF EXISTS "Admins can insert item_texts_360" ON public.item_texts_360;
CREATE POLICY "Admins can insert item_texts_360" ON public.item_texts_360 FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can update item_texts_360" ON public.item_texts_360;
CREATE POLICY "Admins can update item_texts_360" ON public.item_texts_360 FOR UPDATE USING (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete item_texts_360" ON public.item_texts_360;
CREATE POLICY "Admins can delete item_texts_360" ON public.item_texts_360 FOR DELETE USING (has_admin_access(auth.uid()));

-- entidades_territoriales
DROP POLICY IF EXISTS "Admins can insert entidades" ON public.entidades_territoriales;
CREATE POLICY "Admins can insert entidades" ON public.entidades_territoriales FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can update entidades" ON public.entidades_territoriales;
CREATE POLICY "Admins can update entidades" ON public.entidades_territoriales FOR UPDATE USING (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete entidades" ON public.entidades_territoriales;
CREATE POLICY "Admins can delete entidades" ON public.entidades_territoriales FOR DELETE USING (has_admin_access(auth.uid()));

-- municipios
DROP POLICY IF EXISTS "Admins can insert municipios" ON public.municipios;
CREATE POLICY "Admins can insert municipios" ON public.municipios FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can update municipios" ON public.municipios;
CREATE POLICY "Admins can update municipios" ON public.municipios FOR UPDATE USING (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete municipios" ON public.municipios;
CREATE POLICY "Admins can delete municipios" ON public.municipios FOR DELETE USING (has_admin_access(auth.uid()));

-- instituciones
DROP POLICY IF EXISTS "Admins can insert instituciones" ON public.instituciones;
CREATE POLICY "Admins can insert instituciones" ON public.instituciones FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can update instituciones" ON public.instituciones;
CREATE POLICY "Admins can update instituciones" ON public.instituciones FOR UPDATE USING (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete instituciones" ON public.instituciones;
CREATE POLICY "Admins can delete instituciones" ON public.instituciones FOR DELETE USING (has_admin_access(auth.uid()));

-- regiones
DROP POLICY IF EXISTS "Admins can insert regiones" ON public.regiones;
CREATE POLICY "Admins can insert regiones" ON public.regiones FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can update regiones" ON public.regiones;
CREATE POLICY "Admins can update regiones" ON public.regiones FOR UPDATE USING (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete regiones" ON public.regiones;
CREATE POLICY "Admins can delete regiones" ON public.regiones FOR DELETE USING (has_admin_access(auth.uid()));

-- region_municipios
DROP POLICY IF EXISTS "Admins can insert region_municipios" ON public.region_municipios;
CREATE POLICY "Admins can insert region_municipios" ON public.region_municipios FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can update region_municipios" ON public.region_municipios;
CREATE POLICY "Admins can update region_municipios" ON public.region_municipios FOR UPDATE USING (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete region_municipios" ON public.region_municipios;
CREATE POLICY "Admins can delete region_municipios" ON public.region_municipios FOR DELETE USING (has_admin_access(auth.uid()));

-- region_instituciones
DROP POLICY IF EXISTS "Admins can insert region_instituciones" ON public.region_instituciones;
CREATE POLICY "Admins can insert region_instituciones" ON public.region_instituciones FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can update region_instituciones" ON public.region_instituciones;
CREATE POLICY "Admins can update region_instituciones" ON public.region_instituciones FOR UPDATE USING (has_admin_access(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete region_instituciones" ON public.region_instituciones;
CREATE POLICY "Admins can delete region_instituciones" ON public.region_instituciones FOR DELETE USING (has_admin_access(auth.uid()));

-- user_roles (view only)
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_admin_access(auth.uid()));
