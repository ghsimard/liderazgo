
-- Add es_anonimo column to contact_messages
ALTER TABLE public.contact_messages ADD COLUMN es_anonimo boolean NOT NULL DEFAULT false;

-- Add es_anonimo column to site_reviews
ALTER TABLE public.site_reviews ADD COLUMN es_anonimo boolean NOT NULL DEFAULT false;
