
-- Table dédiée pour les évaluations/reviews du site
CREATE TABLE public.site_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_reviews ENABLE ROW LEVEL SECURITY;

-- Public peut insérer des reviews
CREATE POLICY "Public can insert site_reviews"
ON public.site_reviews FOR INSERT
WITH CHECK (true);

-- Superadmins peuvent lire les reviews
CREATE POLICY "Superadmins can read site_reviews"
ON public.site_reviews FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Superadmins peuvent supprimer les reviews
CREATE POLICY "Superadmins can delete site_reviews"
ON public.site_reviews FOR DELETE
USING (has_role(auth.uid(), 'superadmin'::app_role));
