
-- Table to store deleted records for permanent undo
CREATE TABLE public.deleted_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_type TEXT NOT NULL, -- 'domain', 'competency', 'item'
  record_label TEXT NOT NULL, -- human-readable label for display
  deleted_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- full backup of all cascaded data
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.deleted_records ENABLE ROW LEVEL SECURITY;

-- Only admins can manage deleted records
CREATE POLICY "Admins can read deleted_records"
  ON public.deleted_records FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert deleted_records"
  ON public.deleted_records FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete deleted_records"
  ON public.deleted_records FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
