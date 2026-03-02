
ALTER TABLE public.contact_messages
  ADD COLUMN telefono text,
  ADD COLUMN codigo_pais text NOT NULL DEFAULT '+57',
  ADD COLUMN contactar_whatsapp boolean NOT NULL DEFAULT false;
