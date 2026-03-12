
-- Table: satisfaccion_config (admin controls availability)
CREATE TABLE public.satisfaccion_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type text NOT NULL,
  module_number integer NOT NULL,
  region text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  available_from timestamptz,
  available_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(form_type, module_number, region)
);

ALTER TABLE public.satisfaccion_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read satisfaccion_config" ON public.satisfaccion_config FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert satisfaccion_config" ON public.satisfaccion_config FOR INSERT TO public WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update satisfaccion_config" ON public.satisfaccion_config FOR UPDATE TO public USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete satisfaccion_config" ON public.satisfaccion_config FOR DELETE TO public USING (has_admin_access(auth.uid()));

-- Table: satisfaccion_responses
CREATE TABLE public.satisfaccion_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type text NOT NULL,
  module_number integer NOT NULL,
  region text NOT NULL,
  cedula text NOT NULL,
  respuestas jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(form_type, module_number, cedula)
);

ALTER TABLE public.satisfaccion_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert satisfaccion_responses" ON public.satisfaccion_responses FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Admins can read satisfaccion_responses" ON public.satisfaccion_responses FOR SELECT TO public USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update satisfaccion_responses" ON public.satisfaccion_responses FOR UPDATE TO public USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete satisfaccion_responses" ON public.satisfaccion_responses FOR DELETE TO public USING (has_admin_access(auth.uid()));
