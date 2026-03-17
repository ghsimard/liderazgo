-- Add SELECT policies for viewers on admin-only readable tables
CREATE POLICY "Viewers can read encuestas_360"
ON public.encuestas_360
FOR SELECT
TO authenticated
USING (has_read_access(auth.uid()));

CREATE POLICY "Viewers can read encuestas_ambiente_escolar"
ON public.encuestas_ambiente_escolar
FOR SELECT
TO authenticated
USING (has_read_access(auth.uid()));

CREATE POLICY "Viewers can read informe_asistencia"
ON public.informe_asistencia
FOR SELECT
TO authenticated
USING (has_read_access(auth.uid()));

CREATE POLICY "Viewers can read user_activity_log"
ON public.user_activity_log
FOR SELECT
TO authenticated
USING (has_read_access(auth.uid()));

CREATE POLICY "Viewers can read user_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_read_access(auth.uid()));

CREATE POLICY "Viewers can read satisfaccion_responses"
ON public.satisfaccion_responses
FOR SELECT
TO authenticated
USING (has_read_access(auth.uid()));