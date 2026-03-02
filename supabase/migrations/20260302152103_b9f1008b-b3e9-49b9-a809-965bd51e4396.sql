
-- App settings key-value table
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Public can read app_settings"
ON public.app_settings FOR SELECT
USING (true);

-- Only superadmins can modify
CREATE POLICY "Superadmins can update app_settings"
ON public.app_settings FOR UPDATE
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can insert app_settings"
ON public.app_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can delete app_settings"
ON public.app_settings FOR DELETE
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Seed the review toggle (enabled by default)
INSERT INTO public.app_settings (key, value) VALUES ('review_modal_enabled', 'true');
