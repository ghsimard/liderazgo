
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  email text NOT NULL,
  asunto text NOT NULL,
  mensaje text NOT NULL,
  leido boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can read contact_messages"
  ON public.contact_messages FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can update contact_messages"
  ON public.contact_messages FOR UPDATE
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can delete contact_messages"
  ON public.contact_messages FOR DELETE
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Public can insert contact_messages"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);
