CREATE TABLE IF NOT EXISTS encuesta_360_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fase text NOT NULL,
  scope_type text NOT NULL,
  scope_value text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fase, scope_type, scope_value)
);

ALTER TABLE encuesta_360_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read encuesta_360_visibility" ON encuesta_360_visibility FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert encuesta_360_visibility" ON encuesta_360_visibility FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update encuesta_360_visibility" ON encuesta_360_visibility FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete encuesta_360_visibility" ON encuesta_360_visibility FOR DELETE TO public USING (has_admin_access(auth.uid()));