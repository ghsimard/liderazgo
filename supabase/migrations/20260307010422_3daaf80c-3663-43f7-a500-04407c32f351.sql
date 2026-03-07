
-- MEL KPI Configuration table for Rúbricas
CREATE TABLE mel_kpi_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text DEFAULT '',
  meta_percentage numeric NOT NULL DEFAULT 80,
  formula_type text NOT NULL DEFAULT 'item_level',
  target_item_id uuid REFERENCES rubrica_items(id) ON DELETE SET NULL,
  target_module_number integer,
  required_level text NOT NULL DEFAULT 'avanzado',
  min_modules integer,
  threshold_level text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  color_class text DEFAULT 'border-l-primary',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mel_kpi_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read mel_kpi_config" ON mel_kpi_config FOR SELECT USING (true);
CREATE POLICY "Admins can insert mel_kpi_config" ON mel_kpi_config FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update mel_kpi_config" ON mel_kpi_config FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete mel_kpi_config" ON mel_kpi_config FOR DELETE USING (has_admin_access(auth.uid()));

-- Seed KPI1 (module_count type)
INSERT INTO mel_kpi_config (kpi_key, label, description, meta_percentage, formula_type, target_module_number, required_level, min_modules, threshold_level, sort_order, color_class) VALUES
('kpi1', 'Indicador 1', '% de rectores con nivel Intermedio o Avanzado en al menos 3 de 4 módulos', 85, 'module_count', NULL, 'intermedio', 3, 'intermedio', 1, 'border-l-blue-500');

-- Seed KPI3 (module_level type)
INSERT INTO mel_kpi_config (kpi_key, label, description, meta_percentage, formula_type, target_module_number, required_level, sort_order, color_class) VALUES
('kpi3', 'Indicador 3', '% de rectores con nivel Avanzado en Módulo 3 (trabajo colaborativo)', 80, 'module_level', 3, 'avanzado', 4, 'border-l-purple-500');

-- Seed KPI2a (item_level) - Autoconocimiento
INSERT INTO mel_kpi_config (kpi_key, label, description, meta_percentage, formula_type, target_item_id, required_level, sort_order, color_class)
SELECT 'kpi2a', 'Indicador 2a', '% de rectores con nivel Avanzado en Autoconocimiento', 80, 'item_level', ri.id, 'avanzado', 2, 'border-l-emerald-500'
FROM rubrica_items ri JOIN rubrica_modules rm ON ri.module_id = rm.id
WHERE rm.module_number = 1 AND ri.sort_order = 1 LIMIT 1;

-- Seed KPI2b (item_level) - Comunicación asertiva
INSERT INTO mel_kpi_config (kpi_key, label, description, meta_percentage, formula_type, target_item_id, required_level, sort_order, color_class)
SELECT 'kpi2b', 'Indicador 2b', '% de rectores con nivel Avanzado en Comunicación asertiva', 80, 'item_level', ri.id, 'avanzado', 3, 'border-l-amber-500'
FROM rubrica_items ri JOIN rubrica_modules rm ON ri.module_id = rm.id
WHERE rm.module_number = 2 AND ri.sort_order = 1 LIMIT 1;

-- MEL 360 settings
INSERT INTO app_settings (key, value) VALUES
('mel_360_progression_threshold', '0.5'),
('mel_360_global_meta', '80')
ON CONFLICT (key) DO NOTHING;
