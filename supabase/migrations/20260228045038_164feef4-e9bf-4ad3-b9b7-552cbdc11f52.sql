
-- Table to track submission dates per directivo, module, and step type
CREATE TABLE public.rubrica_submission_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directivo_cedula TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  submission_type TEXT NOT NULL, -- 'autoevaluacion', 'evaluacion', 'nivel_acordado', 'seguimiento'
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (directivo_cedula, module_number, submission_type)
);

CREATE INDEX idx_rubrica_submission_dates_cedula ON public.rubrica_submission_dates(directivo_cedula);

-- RLS
ALTER TABLE public.rubrica_submission_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read rubrica_submission_dates"
ON public.rubrica_submission_dates FOR SELECT USING (true);

CREATE POLICY "Public can insert rubrica_submission_dates"
ON public.rubrica_submission_dates FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update rubrica_submission_dates"
ON public.rubrica_submission_dates FOR UPDATE USING (true);

CREATE POLICY "Admins can delete rubrica_submission_dates"
ON public.rubrica_submission_dates FOR DELETE USING (has_admin_access(auth.uid()));
