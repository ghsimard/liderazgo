
-- ══════════════════════════════════════════════════════════
-- Domains (3 gestion domains)
-- ══════════════════════════════════════════════════════════
CREATE TABLE public.domains_360 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

ALTER TABLE public.domains_360 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read domains_360" ON public.domains_360 FOR SELECT USING (true);
CREATE POLICY "Admins can insert domains_360" ON public.domains_360 FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update domains_360" ON public.domains_360 FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete domains_360" ON public.domains_360 FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed domains
INSERT INTO public.domains_360 (key, label, sort_order) VALUES
  ('gestion_personal', 'Gestión Personal', 1),
  ('gestion_pedagogica', 'Gestión Pedagógica', 2),
  ('gestion_administrativa_comunitaria', 'Gestión Administrativa y Comunitaria', 3);

-- ══════════════════════════════════════════════════════════
-- Competencies (13 base competencies)
-- ══════════════════════════════════════════════════════════
CREATE TABLE public.competencies_360 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  domain_id uuid NOT NULL REFERENCES public.domains_360(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0
);

ALTER TABLE public.competencies_360 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read competencies_360" ON public.competencies_360 FOR SELECT USING (true);
CREATE POLICY "Admins can insert competencies_360" ON public.competencies_360 FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update competencies_360" ON public.competencies_360 FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete competencies_360" ON public.competencies_360 FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed competencies
INSERT INTO public.competencies_360 (key, label, domain_id, sort_order)
SELECT v.key, v.label, d.id, v.sort_order
FROM (VALUES
  ('autoconciencia', 'Autoconciencia', 'gestion_personal', 1),
  ('emociones', 'Manejo de las emociones', 'gestion_personal', 2),
  ('comunicacion', 'Comunicación asertiva', 'gestion_personal', 3),
  ('colaborativo', 'Trabajo colaborativo', 'gestion_personal', 4),
  ('direccion', 'Dirección del PEI', 'gestion_pedagogica', 5),
  ('orientacion', 'Orientación pedagógica', 'gestion_pedagogica', 6),
  ('convivencia', 'Convivencia', 'gestion_pedagogica', 7),
  ('evaluacion', 'Fomento de la cultura de la evaluación', 'gestion_pedagogica', 8),
  ('vision', 'Fomento de la visión compartida', 'gestion_administrativa_comunitaria', 9),
  ('planeacion', 'Planeación institucional', 'gestion_administrativa_comunitaria', 10),
  ('redes', 'Construcción de redes', 'gestion_administrativa_comunitaria', 11),
  ('alianzas', 'Generación de alianzas', 'gestion_administrativa_comunitaria', 12),
  ('rendicion', 'Rendición de cuentas', 'gestion_administrativa_comunitaria', 13)
) AS v(key, label, domain_key, sort_order)
JOIN public.domains_360 d ON d.key = v.domain_key;

-- ══════════════════════════════════════════════════════════
-- Items (39 items with competency variant mapping)
-- ══════════════════════════════════════════════════════════
CREATE TABLE public.items_360 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_number int NOT NULL UNIQUE,
  competency_key text NOT NULL,
  response_type text NOT NULL CHECK (response_type IN ('frequency', 'agreement')),
  sort_order int NOT NULL DEFAULT 0
);

ALTER TABLE public.items_360 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read items_360" ON public.items_360 FOR SELECT USING (true);
CREATE POLICY "Admins can insert items_360" ON public.items_360 FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update items_360" ON public.items_360 FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete items_360" ON public.items_360 FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed items
INSERT INTO public.items_360 (item_number, competency_key, response_type, sort_order) VALUES
  (1, 'autoconciencia_2', 'frequency', 1),
  (2, 'direccion_2', 'frequency', 2),
  (3, 'vision_2', 'frequency', 3),
  (4, 'autoconciencia_3', 'frequency', 4),
  (5, 'direccion_3', 'frequency', 5),
  (6, 'planeacion_2', 'frequency', 6),
  (7, 'emociones_1', 'frequency', 7),
  (8, 'orientacion_2', 'frequency', 8),
  (9, 'planeacion_3', 'frequency', 9),
  (10, 'emociones_2', 'frequency', 10),
  (11, 'convivencia_3', 'frequency', 11),
  (12, 'alianzas_2', 'frequency', 12),
  (13, 'comunicacion_2', 'frequency', 13),
  (14, 'evaluacion_2', 'frequency', 14),
  (15, 'rendicion_2', 'frequency', 15),
  (16, 'colaborativo_2', 'frequency', 16),
  (17, 'evaluacion_3', 'frequency', 17),
  (18, 'rendicion_3', 'frequency', 18),
  (19, 'alianzas_1', 'agreement', 19),
  (20, 'autoconciencia_1', 'agreement', 20),
  (21, 'direccion_1', 'agreement', 21),
  (22, 'vision_1', 'agreement', 22),
  (23, 'alianzas_3', 'agreement', 23),
  (24, 'emociones_3', 'agreement', 24),
  (25, 'orientacion_1', 'agreement', 25),
  (26, 'vision_3', 'agreement', 26),
  (27, 'rendicion_1', 'agreement', 27),
  (28, 'comunicacion_1', 'agreement', 28),
  (29, 'orientacion_3', 'agreement', 29),
  (30, 'planeacion_1', 'agreement', 30),
  (31, 'comunicacion_3', 'agreement', 31),
  (32, 'convivencia_1', 'agreement', 32),
  (33, 'redes_1', 'agreement', 33),
  (34, 'colaborativo_1', 'agreement', 34),
  (35, 'convivencia_2', 'agreement', 35),
  (36, 'redes_2', 'agreement', 36),
  (37, 'colaborativo_3', 'agreement', 37),
  (38, 'evaluacion_1', 'agreement', 38),
  (39, 'redes_3', 'agreement', 39);

-- ══════════════════════════════════════════════════════════
-- Item Texts (per form type)
-- ══════════════════════════════════════════════════════════
CREATE TABLE public.item_texts_360 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.items_360(id) ON DELETE CASCADE,
  form_type text NOT NULL,
  text text NOT NULL,
  UNIQUE(item_id, form_type)
);

ALTER TABLE public.item_texts_360 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read item_texts_360" ON public.item_texts_360 FOR SELECT USING (true);
CREATE POLICY "Admins can insert item_texts_360" ON public.item_texts_360 FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update item_texts_360" ON public.item_texts_360 FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete item_texts_360" ON public.item_texts_360 FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
