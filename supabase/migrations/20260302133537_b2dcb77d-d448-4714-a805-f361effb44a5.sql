
-- Add contact type and star rating to contact_messages
ALTER TABLE public.contact_messages 
  ADD COLUMN IF NOT EXISTS tipo_contacto TEXT NOT NULL DEFAULT 'contacto',
  ADD COLUMN IF NOT EXISTS rating INTEGER;
