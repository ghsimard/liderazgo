
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_detail TEXT,
  page_path TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_cedula ON public.user_activity_log(cedula);
CREATE INDEX idx_activity_log_action_type ON public.user_activity_log(action_type);
CREATE INDEX idx_activity_log_created_at ON public.user_activity_log(created_at DESC);

ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert activity_log"
  ON public.user_activity_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read activity_log"
  ON public.user_activity_log FOR SELECT
  USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete activity_log"
  ON public.user_activity_log FOR DELETE
  USING (has_admin_access(auth.uid()));
