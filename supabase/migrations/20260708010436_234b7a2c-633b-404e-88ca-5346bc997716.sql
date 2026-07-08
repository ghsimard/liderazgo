
-- Dupliquer les encuestas Ambiente Escolar 2025 vers encuestas_ambiente_escolar
-- pour les IE Bello Horizonte, El Diamante, Ciudad Don Bosco, Manuel Uribe Ángel
-- Cohorte Medellín 2025 (linea_base)

WITH cfg AS (
  SELECT
    'c25708c1-54f7-4044-96bc-7d15bf449d4f'::uuid AS cohorte_id,
    'b0baca1f-0c94-44d8-a9d0-0072644a0396'::uuid AS campana_id,
    'Medellín'::text AS entidad_territorial,
    'linea_base'::text AS fase,
    ARRAY['%bello horizonte%','%diamante%','%don bosco%','%manuel uribe%'] AS ie_patterns
)
INSERT INTO public.encuestas_ambiente_escolar
  (created_at, tipo_formulario, institucion_educativa, respuestas, cohorte_id, entidad_territorial, fase, campana_id)
SELECT s.created_at, 'docentes', s.institucion_educativa,
  jsonb_build_object(
    'anos_como_docente', s.anos_como_docente,
    'grados_asignados', s.grados_asignados,
    'jornada', s.jornada,
    'retroalimentacion_de', s.retroalimentacion_de,
    'comunicacion', s.comunicacion,
    'practicas_pedagogicas', s.practicas_pedagogicas,
    'convivencia', s.convivencia
  ),
  cfg.cohorte_id, cfg.entidad_territorial, cfg.fase, cfg.campana_id
FROM public.ae_docentes_submissions_2025 s, cfg
WHERE s.institucion_educativa ILIKE ANY (cfg.ie_patterns)
  AND NOT EXISTS (
    SELECT 1 FROM public.encuestas_ambiente_escolar e
    WHERE e.tipo_formulario = 'docentes'
      AND e.institucion_educativa = s.institucion_educativa
      AND e.cohorte_id = cfg.cohorte_id
      AND e.created_at = s.created_at
  );

WITH cfg AS (
  SELECT
    'c25708c1-54f7-4044-96bc-7d15bf449d4f'::uuid AS cohorte_id,
    'b0baca1f-0c94-44d8-a9d0-0072644a0396'::uuid AS campana_id,
    'Medellín'::text AS entidad_territorial,
    'linea_base'::text AS fase,
    ARRAY['%bello horizonte%','%diamante%','%don bosco%','%manuel uribe%'] AS ie_patterns
)
INSERT INTO public.encuestas_ambiente_escolar
  (created_at, tipo_formulario, institucion_educativa, respuestas, cohorte_id, entidad_territorial, fase, campana_id)
SELECT s.created_at, 'estudiantes', s.institucion_educativa,
  jsonb_build_object(
    'anos_estudiando', s.anos_estudiando,
    'grado_actual', s.grado_actual,
    'jornada', s.jornada,
    'comunicacion', s.comunicacion,
    'practicas_pedagogicas', s.practicas_pedagogicas,
    'convivencia', s.convivencia
  ),
  cfg.cohorte_id, cfg.entidad_territorial, cfg.fase, cfg.campana_id
FROM public.ae_estudiantes_submissions_2025 s, cfg
WHERE s.institucion_educativa ILIKE ANY (cfg.ie_patterns)
  AND NOT EXISTS (
    SELECT 1 FROM public.encuestas_ambiente_escolar e
    WHERE e.tipo_formulario = 'estudiantes'
      AND e.institucion_educativa = s.institucion_educativa
      AND e.cohorte_id = cfg.cohorte_id
      AND e.created_at = s.created_at
  );

WITH cfg AS (
  SELECT
    'c25708c1-54f7-4044-96bc-7d15bf449d4f'::uuid AS cohorte_id,
    'b0baca1f-0c94-44d8-a9d0-0072644a0396'::uuid AS campana_id,
    'Medellín'::text AS entidad_territorial,
    'linea_base'::text AS fase,
    ARRAY['%bello horizonte%','%diamante%','%don bosco%','%manuel uribe%'] AS ie_patterns
)
INSERT INTO public.encuestas_ambiente_escolar
  (created_at, tipo_formulario, institucion_educativa, respuestas, cohorte_id, entidad_territorial, fase, campana_id)
SELECT s.created_at, 'acudientes', s.institucion_educativa,
  jsonb_build_object(
    'grados_estudiantes', s.grados_estudiantes,
    'comunicacion', s.comunicacion,
    'practicas_pedagogicas', s.practicas_pedagogicas,
    'convivencia', s.convivencia
  ),
  cfg.cohorte_id, cfg.entidad_territorial, cfg.fase, cfg.campana_id
FROM public.ae_acudientes_submissions_2025 s, cfg
WHERE s.institucion_educativa ILIKE ANY (cfg.ie_patterns)
  AND NOT EXISTS (
    SELECT 1 FROM public.encuestas_ambiente_escolar e
    WHERE e.tipo_formulario = 'acudientes'
      AND e.institucion_educativa = s.institucion_educativa
      AND e.cohorte_id = cfg.cohorte_id
      AND e.created_at = s.created_at
  );
