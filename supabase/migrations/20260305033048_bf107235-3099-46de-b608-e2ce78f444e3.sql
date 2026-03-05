CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'id', i.id,
    'email_destinatario', i.email_destinatario,
    'directivo_nombre', i.directivo_nombre,
    'institucion', i.institucion,
    'tipo_formulario', i.tipo_formulario,
    'fase', i.fase,
    'responded_at', i.responded_at,
    'access_count', i.access_count
  )
  FROM encuesta_invitaciones i
  WHERE i.token = p_token
  LIMIT 1;
$$;