
-- Create storage bucket for app images
INSERT INTO storage.buckets (id, name, public) VALUES ('app-images', 'app-images', true);

-- Allow public read access
CREATE POLICY "Public read app-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-images');

-- Allow admin upload
CREATE POLICY "Admins can upload app-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'app-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Allow admin update
CREATE POLICY "Admins can update app-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'app-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Allow admin delete
CREATE POLICY "Admins can delete app-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'app-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Create table to map image keys to storage paths
CREATE TABLE public.app_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_key TEXT NOT NULL UNIQUE,
  storage_path TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.app_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read app_images"
ON public.app_images FOR SELECT
USING (true);

CREATE POLICY "Admins can insert app_images"
ON public.app_images FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update app_images"
ON public.app_images FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete app_images"
ON public.app_images FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
