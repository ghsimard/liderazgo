
CREATE TABLE IF NOT EXISTS public.rubrica_regional_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.rubrica_modules(id) ON DELETE CASCADE,
  analysis_text TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE (module_id)
);

ALTER TABLE public.rubrica_regional_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read rubrica_regional_analyses" ON public.rubrica_regional_analyses FOR SELECT USING (true);
CREATE POLICY "Admins can insert rubrica_regional_analyses" ON public.rubrica_regional_analyses FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update rubrica_regional_analyses" ON public.rubrica_regional_analyses FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete rubrica_regional_analyses" ON public.rubrica_regional_analyses FOR DELETE USING (has_admin_access(auth.uid()));
