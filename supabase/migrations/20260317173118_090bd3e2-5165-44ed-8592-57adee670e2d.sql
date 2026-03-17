
-- Rewrite policies that use has_role() with app_role to use has_admin_access()

-- admin_cedulas (superadmin -> has_admin_access for now, since has_admin_access covers Admin+Superadmin)
DROP POLICY IF EXISTS "Superadmins can delete admin_cedulas" ON public.admin_cedulas;
CREATE POLICY "Superadmins can delete admin_cedulas" ON public.admin_cedulas FOR DELETE USING (has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Superadmins can insert admin_cedulas" ON public.admin_cedulas;
CREATE POLICY "Superadmins can insert admin_cedulas" ON public.admin_cedulas FOR INSERT WITH CHECK (has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Superadmins can update admin_cedulas" ON public.admin_cedulas;
CREATE POLICY "Superadmins can update admin_cedulas" ON public.admin_cedulas FOR UPDATE USING (has_admin_access(auth.uid()));

-- app_settings (superadmin only)
DROP POLICY IF EXISTS "Superadmins can delete app_settings" ON public.app_settings;
CREATE POLICY "Superadmins can delete app_settings" ON public.app_settings FOR DELETE USING (has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Superadmins can insert app_settings" ON public.app_settings;
CREATE POLICY "Superadmins can insert app_settings" ON public.app_settings FOR INSERT WITH CHECK (has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Superadmins can update app_settings" ON public.app_settings;
CREATE POLICY "Superadmins can update app_settings" ON public.app_settings FOR UPDATE USING (has_admin_access(auth.uid()));

-- contact_messages (superadmin)
DROP POLICY IF EXISTS "Superadmins can delete contact_messages" ON public.contact_messages;
CREATE POLICY "Superadmins can delete contact_messages" ON public.contact_messages FOR DELETE USING (has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Superadmins can read contact_messages" ON public.contact_messages;
CREATE POLICY "Superadmins can read contact_messages" ON public.contact_messages FOR SELECT USING (has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Superadmins can update contact_messages" ON public.contact_messages;
CREATE POLICY "Superadmins can update contact_messages" ON public.contact_messages FOR UPDATE USING (has_admin_access(auth.uid()));

-- site_reviews (superadmin)
DROP POLICY IF EXISTS "Superadmins can delete site_reviews" ON public.site_reviews;
CREATE POLICY "Superadmins can delete site_reviews" ON public.site_reviews FOR DELETE USING (has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Superadmins can read site_reviews" ON public.site_reviews;
CREATE POLICY "Superadmins can read site_reviews" ON public.site_reviews FOR SELECT USING (has_admin_access(auth.uid()));

-- storage.objects (admin -> has_admin_access)
DROP POLICY IF EXISTS "Admins can delete app-images" ON storage.objects;
CREATE POLICY "Admins can delete app-images" ON storage.objects FOR DELETE USING (bucket_id = 'app-images' AND has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Admins can update app-images" ON storage.objects;
CREATE POLICY "Admins can update app-images" ON storage.objects FOR UPDATE USING (bucket_id = 'app-images' AND has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Admins can upload app-images" ON storage.objects;
CREATE POLICY "Admins can upload app-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'app-images' AND has_admin_access(auth.uid()));

-- Now drop has_role function, user_roles table, and app_role enum
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP TABLE IF EXISTS public.user_roles;
DROP TYPE IF EXISTS public.app_role;
