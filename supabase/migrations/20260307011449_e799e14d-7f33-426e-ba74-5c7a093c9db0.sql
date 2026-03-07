
-- KPI Groups table
CREATE TABLE public.mel_kpi_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.mel_kpi_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read mel_kpi_groups" ON public.mel_kpi_groups FOR SELECT USING (true);
CREATE POLICY "Admins can insert mel_kpi_groups" ON public.mel_kpi_groups FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update mel_kpi_groups" ON public.mel_kpi_groups FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete mel_kpi_groups" ON public.mel_kpi_groups FOR DELETE USING (has_admin_access(auth.uid()));

-- Junction: which KPIs belong to which group
CREATE TABLE public.mel_kpi_group_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.mel_kpi_groups(id) ON DELETE CASCADE,
  kpi_config_id uuid NOT NULL REFERENCES public.mel_kpi_config(id) ON DELETE CASCADE,
  meta_override numeric DEFAULT NULL,
  UNIQUE(group_id, kpi_config_id)
);

ALTER TABLE public.mel_kpi_group_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read mel_kpi_group_items" ON public.mel_kpi_group_items FOR SELECT USING (true);
CREATE POLICY "Admins can insert mel_kpi_group_items" ON public.mel_kpi_group_items FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update mel_kpi_group_items" ON public.mel_kpi_group_items FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete mel_kpi_group_items" ON public.mel_kpi_group_items FOR DELETE USING (has_admin_access(auth.uid()));

-- Link regions to KPI groups
ALTER TABLE public.regiones ADD COLUMN kpi_group_id uuid REFERENCES public.mel_kpi_groups(id) ON DELETE SET NULL DEFAULT NULL;
