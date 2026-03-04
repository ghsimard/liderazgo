
-- 1. Create encuesta_invitaciones table
CREATE TABLE public.encuesta_invitaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  directivo_cedula text NOT NULL,
  directivo_nombre text NOT NULL,
  institucion text NOT NULL,
  email_destinatario text NOT NULL,
  tipo_formulario text NOT NULL,
  fase text NOT NULL DEFAULT 'inicial',
  sent_at timestamptz NOT NULL DEFAULT now(),
  last_reminder_at timestamptz,
  responded_at timestamptz
);

-- 2. Add email_evaluador to encuestas_360
ALTER TABLE public.encuestas_360 ADD COLUMN email_evaluador text;

-- 3. RLS on encuesta_invitaciones
ALTER TABLE public.encuesta_invitaciones ENABLE ROW LEVEL SECURITY;

-- Public can insert (directivo not authenticated)
CREATE POLICY "Public can insert invitaciones"
  ON public.encuesta_invitaciones FOR INSERT
  WITH CHECK (true);

-- Public can update (for marking responded_at and last_reminder_at)
CREATE POLICY "Public can update invitaciones"
  ON public.encuesta_invitaciones FOR UPDATE
  USING (true);

-- Admin can read all
CREATE POLICY "Admins can read invitaciones"
  ON public.encuesta_invitaciones FOR SELECT
  USING (has_admin_access(auth.uid()));

-- Admin can delete
CREATE POLICY "Admins can delete invitaciones"
  ON public.encuesta_invitaciones FOR DELETE
  USING (has_admin_access(auth.uid()));

-- 4. Function to resolve token → invitation data (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT jsonb_build_object(
    'id', i.id,
    'email_destinatario', i.email_destinatario,
    'directivo_nombre', i.directivo_nombre,
    'institucion', i.institucion,
    'tipo_formulario', i.tipo_formulario,
    'fase', i.fase,
    'responded_at', i.responded_at
  )
  FROM encuesta_invitaciones i
  WHERE i.token = p_token
  LIMIT 1;
$$;

-- 5. Function to get invitations for a directivo (by cedula, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_invitaciones_directivo(p_cedula text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'token', i.token,
      'email_destinatario', i.email_destinatario,
      'tipo_formulario', i.tipo_formulario,
      'fase', i.fase,
      'sent_at', i.sent_at,
      'last_reminder_at', i.last_reminder_at,
      'responded_at', i.responded_at
    ) ORDER BY i.sent_at DESC
  ), '[]'::jsonb)
  FROM encuesta_invitaciones i
  WHERE i.directivo_cedula = p_cedula;
$$;
