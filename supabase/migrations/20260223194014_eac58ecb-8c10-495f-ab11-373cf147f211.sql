
-- Table to store competency weights (one row per competency_key × observer role)
CREATE TABLE public.competency_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_key text NOT NULL,
  observer_role text NOT NULL CHECK (observer_role IN ('coor', 'doce', 'admi', 'acud', 'estu')),
  weight numeric(4,3) NOT NULL DEFAULT 0.000,
  UNIQUE (competency_key, observer_role)
);

ALTER TABLE public.competency_weights ENABLE ROW LEVEL SECURITY;

-- Public can read (needed for scoring on client)
CREATE POLICY "Public can read weights"
  ON public.competency_weights FOR SELECT
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert weights"
  ON public.competency_weights FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update weights"
  ON public.competency_weights FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete weights"
  ON public.competency_weights FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed with current hardcoded values
INSERT INTO public.competency_weights (competency_key, observer_role, weight) VALUES
  ('autoconciencia_1','coor',0.510),('autoconciencia_1','doce',0.340),('autoconciencia_1','admi',0.050),('autoconciencia_1','acud',0.050),('autoconciencia_1','estu',0.050),
  ('autoconciencia_2','coor',0.300),('autoconciencia_2','doce',0.300),('autoconciencia_2','admi',0.200),('autoconciencia_2','acud',0.100),('autoconciencia_2','estu',0.100),
  ('autoconciencia_3','coor',0.200),('autoconciencia_3','doce',0.200),('autoconciencia_3','admi',0.200),('autoconciencia_3','acud',0.200),('autoconciencia_3','estu',0.200),
  ('emociones_1','coor',0.300),('emociones_1','doce',0.200),('emociones_1','admi',0.166),('emociones_1','acud',0.166),('emociones_1','estu',0.166),
  ('emociones_2','coor',0.510),('emociones_2','doce',0.340),('emociones_2','admi',0.050),('emociones_2','acud',0.050),('emociones_2','estu',0.050),
  ('emociones_3','coor',0.200),('emociones_3','doce',0.200),('emociones_3','admi',0.200),('emociones_3','acud',0.200),('emociones_3','estu',0.200),
  ('comunicacion_1','coor',0.350),('comunicacion_1','doce',0.350),('comunicacion_1','admi',0.100),('comunicacion_1','acud',0.100),('comunicacion_1','estu',0.100),
  ('comunicacion_2','coor',0.300),('comunicacion_2','doce',0.200),('comunicacion_2','admi',0.166),('comunicacion_2','acud',0.166),('comunicacion_2','estu',0.166),
  ('comunicacion_3','coor',0.250),('comunicacion_3','doce',0.250),('comunicacion_3','admi',0.166),('comunicacion_3','acud',0.166),('comunicacion_3','estu',0.166),
  ('colaborativo_1','coor',0.337),('colaborativo_1','doce',0.337),('colaborativo_1','admi',0.224),('colaborativo_1','acud',0.050),('colaborativo_1','estu',0.050),
  ('colaborativo_2','coor',0.337),('colaborativo_2','doce',0.337),('colaborativo_2','admi',0.224),('colaborativo_2','acud',0.050),('colaborativo_2','estu',0.050),
  ('colaborativo_3','coor',0.250),('colaborativo_3','doce',0.250),('colaborativo_3','admi',0.166),('colaborativo_3','acud',0.166),('colaborativo_3','estu',0.166),
  ('direccion_1','coor',0.425),('direccion_1','doce',0.425),('direccion_1','admi',0.050),('direccion_1','acud',0.050),('direccion_1','estu',0.050),
  ('direccion_2','coor',0.420),('direccion_2','doce',0.280),('direccion_2','admi',0.100),('direccion_2','acud',0.100),('direccion_2','estu',0.100),
  ('direccion_3','coor',0.250),('direccion_3','doce',0.250),('direccion_3','admi',0.166),('direccion_3','acud',0.166),('direccion_3','estu',0.166),
  ('orientacion_1','coor',0.250),('orientacion_1','doce',0.250),('orientacion_1','admi',0.166),('orientacion_1','acud',0.166),('orientacion_1','estu',0.166),
  ('orientacion_2','coor',0.425),('orientacion_2','doce',0.425),('orientacion_2','admi',0.050),('orientacion_2','acud',0.050),('orientacion_2','estu',0.050),
  ('orientacion_3','coor',0.200),('orientacion_3','doce',0.200),('orientacion_3','admi',0.200),('orientacion_3','acud',0.200),('orientacion_3','estu',0.200),
  ('convivencia_1','coor',0.250),('convivencia_1','doce',0.250),('convivencia_1','admi',0.166),('convivencia_1','acud',0.166),('convivencia_1','estu',0.166),
  ('convivencia_2','coor',0.350),('convivencia_2','doce',0.350),('convivencia_2','admi',0.100),('convivencia_2','acud',0.100),('convivencia_2','estu',0.100),
  ('convivencia_3','coor',0.200),('convivencia_3','doce',0.200),('convivencia_3','admi',0.200),('convivencia_3','acud',0.200),('convivencia_3','estu',0.200),
  ('evaluacion_1','coor',0.425),('evaluacion_1','doce',0.425),('evaluacion_1','admi',0.050),('evaluacion_1','acud',0.050),('evaluacion_1','estu',0.050),
  ('evaluacion_2','coor',0.350),('evaluacion_2','doce',0.350),('evaluacion_2','admi',0.100),('evaluacion_2','acud',0.100),('evaluacion_2','estu',0.100),
  ('evaluacion_3','coor',0.200),('evaluacion_3','doce',0.300),('evaluacion_3','admi',0.166),('evaluacion_3','acud',0.166),('evaluacion_3','estu',0.166),
  ('vision_1','coor',0.350),('vision_1','doce',0.350),('vision_1','admi',0.100),('vision_1','acud',0.100),('vision_1','estu',0.100),
  ('vision_2','coor',0.425),('vision_2','doce',0.425),('vision_2','admi',0.050),('vision_2','acud',0.050),('vision_2','estu',0.050),
  ('vision_3','coor',0.200),('vision_3','doce',0.200),('vision_3','admi',0.200),('vision_3','acud',0.200),('vision_3','estu',0.200),
  ('planeacion_1','coor',0.250),('planeacion_1','doce',0.250),('planeacion_1','admi',0.166),('planeacion_1','acud',0.166),('planeacion_1','estu',0.166),
  ('planeacion_2','coor',0.360),('planeacion_2','doce',0.240),('planeacion_2','admi',0.200),('planeacion_2','acud',0.100),('planeacion_2','estu',0.100),
  ('planeacion_3','coor',0.250),('planeacion_3','doce',0.250),('planeacion_3','admi',0.166),('planeacion_3','acud',0.166),('planeacion_3','estu',0.166),
  ('redes_1','coor',0.420),('redes_1','doce',0.280),('redes_1','admi',0.100),('redes_1','acud',0.100),('redes_1','estu',0.100),
  ('redes_2','coor',0.350),('redes_2','doce',0.350),('redes_2','admi',0.100),('redes_2','acud',0.100),('redes_2','estu',0.100),
  ('redes_3','coor',0.425),('redes_3','doce',0.425),('redes_3','admi',0.050),('redes_3','acud',0.050),('redes_3','estu',0.050),
  ('alianzas_1','coor',0.300),('alianzas_1','doce',0.200),('alianzas_1','admi',0.166),('alianzas_1','acud',0.166),('alianzas_1','estu',0.166),
  ('alianzas_2','coor',0.510),('alianzas_2','doce',0.340),('alianzas_2','admi',0.050),('alianzas_2','acud',0.050),('alianzas_2','estu',0.050),
  ('alianzas_3','coor',0.350),('alianzas_3','doce',0.350),('alianzas_3','admi',0.100),('alianzas_3','acud',0.100),('alianzas_3','estu',0.100),
  ('rendicion_1','coor',0.300),('rendicion_1','doce',0.200),('rendicion_1','admi',0.166),('rendicion_1','acud',0.166),('rendicion_1','estu',0.166),
  ('rendicion_2','coor',0.440),('rendicion_2','doce',0.294),('rendicion_2','admi',0.166),('rendicion_2','acud',0.050),('rendicion_2','estu',0.050),
  ('rendicion_3','coor',0.200),('rendicion_3','doce',0.200),('rendicion_3','admi',0.200),('rendicion_3','acud',0.200),('rendicion_3','estu',0.200);
