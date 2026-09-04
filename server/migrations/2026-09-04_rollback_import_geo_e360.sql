-- ============================================================
-- Rollback de la importación geográfica de E360 del 3 ago 2026
-- ============================================================
-- Objetivo: eliminar del referente RLT las entidades, municipios e
-- instituciones creados por la importación masiva de E360 Insights,
-- conservando únicamente las filas que ya están referenciadas por
-- fichas, encuestas, asignaciones u otros datos de RLT/360.
--
-- Orden de ejecución:
--   1. Ejecutar todo el script en una transacción (BEGIN/COMMIT).
--   2. Revisar los mensajes devueltos por las consultas SELECT.
--   3. Si algo va mal, ejecutar la sección UNDO al final.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0. BACKUP SEGURO (no destruye un backup anterior)
-- ------------------------------------------------------------
DO $$
DECLARE
  old_name text;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = '_undo_geo_import_20260803') THEN
    old_name := '_undo_geo_import_20260803_' || to_char(now(), 'YYYYMMDD_HH24MISS');
    EXECUTE format('ALTER TABLE public._undo_geo_import_20260803 RENAME TO %I', old_name);
    RAISE NOTICE 'Backup anterior renombrado a: %', old_name;
  END IF;
END $$;

CREATE TABLE public._undo_geo_import_20260803 AS
SELECT
  'institucion' AS tipo,
  i.id AS registro_id,
  i.nombre AS nombre,
  i.municipio_id AS parent_id,
  i.created_at AS creado_el,
  NULL::uuid AS entidad_territorial_id
FROM public.instituciones i
WHERE DATE(i.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = '2026-08-03'
UNION ALL
SELECT
  'municipio',
  m.id,
  m.nombre,
  m.entidad_territorial_id,
  m.created_at,
  NULL::uuid
FROM public.municipios m
WHERE DATE(m.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = '2026-08-03'
UNION ALL
SELECT
  'entidad',
  e.id,
  e.nombre,
  NULL::uuid,
  e.created_at,
  NULL::uuid
FROM public.entidades_territoriales e
WHERE DATE(e.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = '2026-08-03';

-- Guardar también los enlaces region -> institución/municipio que sean de registros importados
DROP TABLE IF EXISTS public._undo_geo_links_20260803;
CREATE TABLE public._undo_geo_links_20260803 AS
SELECT 'region_municipio' AS tipo, rm.region_id, rm.municipio_id AS child_id, now() AS backup_at
FROM public.region_municipios rm
WHERE rm.municipio_id IN (
  SELECT id FROM public.municipios
  WHERE DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = '2026-08-03'
)
UNION ALL
SELECT 'region_institucion', ri.region_id, ri.institucion_id, now()
FROM public.region_instituciones ri
WHERE ri.institucion_id IN (
  SELECT id FROM public.instituciones
  WHERE DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = '2026-08-03'
);

CREATE INDEX ON public._undo_geo_import_20260803(tipo, registro_id);
CREATE INDEX ON public._undo_geo_links_20260803(tipo, child_id);

SELECT 'Backup creado: ' || count(*) || ' filas' AS msg FROM public._undo_geo_import_20260803;

-- ------------------------------------------------------------
-- 1. INSTITUCIONES IMPORTADAS SIN REFERENCIAS -> ELIMINAR
-- ------------------------------------------------------------
DROP TABLE IF EXISTS _tmp_instituciones_a_borrar;
CREATE TEMP TABLE _tmp_instituciones_a_borrar AS
SELECT i.id
FROM public.instituciones i
WHERE DATE(i.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = '2026-08-03'
  AND NOT EXISTS (SELECT 1 FROM public.fichas_rlt f WHERE f.nombre_ie = i.nombre)
  AND NOT EXISTS (SELECT 1 FROM public.encuestas_360 e WHERE e.institucion_educativa = i.nombre)
  AND NOT EXISTS (SELECT 1 FROM public.encuesta_invitaciones inv WHERE inv.institucion = i.nombre)
  AND NOT EXISTS (SELECT 1 FROM public.rubrica_asignaciones ra WHERE ra.institucion = i.nombre)
  AND NOT EXISTS (SELECT 1 FROM public.encuestas_ambiente_escolar am WHERE am.institucion_educativa = i.nombre)
  AND NOT EXISTS (SELECT 1 FROM public.ae_cohorte_instituciones ci WHERE ci.institucion_educativa = i.nombre)
  AND NOT EXISTS (SELECT 1 FROM public.ae_docentes_submissions_2025 d WHERE d.institucion_educativa = i.nombre)
  AND NOT EXISTS (SELECT 1 FROM public.ae_estudiantes_submissions_2025 est WHERE est.institucion_educativa = i.nombre)
  AND NOT EXISTS (SELECT 1 FROM public.ae_acudientes_submissions_2025 ac WHERE ac.institucion_educativa = i.nombre)
  AND NOT EXISTS (SELECT 1 FROM public.ae_rectores_2025 r WHERE r.nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ = i.nombre)
  AND NOT EXISTS (SELECT 1 FROM public.operator_permissions op WHERE op.institucion = i.nombre)
  AND NOT EXISTS (SELECT 1 FROM public.region_instituciones ri WHERE ri.institucion_id = i.id)
  AND NOT EXISTS (SELECT 1 FROM public.institucion_renames ir WHERE ir.old_name = i.nombre OR ir.new_name = i.nombre);

SELECT 'Instituciones importadas sin referencias (listas para borrar): ' || count(*) AS msg FROM _tmp_instituciones_a_borrar;

-- Listar instituciones importadas que SÍ tienen referencias (no se borrarán)
DO $$
DECLARE
  n integer;
  rec record;
BEGIN
  SELECT count(*) INTO n
  FROM public.instituciones i
  WHERE DATE(i.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = '2026-08-03'
    AND NOT EXISTS (SELECT 1 FROM _tmp_instituciones_a_borrar b WHERE b.id = i.id);
  IF n > 0 THEN
    RAISE NOTICE 'ADVERTENCIA: % instituciones importadas tienen referencias y NO se borrarán:', n;
    FOR rec IN
      SELECT i.nombre
      FROM public.instituciones i
      WHERE DATE(i.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = '2026-08-03'
        AND NOT EXISTS (SELECT 1 FROM _tmp_instituciones_a_borrar b WHERE b.id = i.id)
    LOOP
      RAISE NOTICE '  - %', rec.nombre;
    END LOOP;
  END IF;
END $$;

DELETE FROM public.instituciones
WHERE id IN (SELECT id FROM _tmp_instituciones_a_borrar);

-- ------------------------------------------------------------
-- 2. MUNICIPIOS IMPORTADOS SIN REFERENCIAS -> ELIMINAR
-- ------------------------------------------------------------
DROP TABLE IF EXISTS _tmp_municipios_a_borrar;
CREATE TEMP TABLE _tmp_municipios_a_borrar AS
SELECT m.id
FROM public.municipios m
WHERE DATE(m.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = '2026-08-03'
  AND NOT EXISTS (SELECT 1 FROM public.instituciones i WHERE i.municipio_id = m.id)
  AND NOT EXISTS (SELECT 1 FROM public.region_municipios rm WHERE rm.municipio_id = m.id);

SELECT 'Municipios importados sin referencias (listos para borrar): ' || count(*) AS msg FROM _tmp_municipios_a_borrar;

DELETE FROM public.municipios
WHERE id IN (SELECT id FROM _tmp_municipios_a_borrar);

-- ------------------------------------------------------------
-- 3. ENTIDADES TERRITORIALES IMPORTADAS SIN REFERENCIAS -> ELIMINAR
-- ------------------------------------------------------------
DROP TABLE IF EXISTS _tmp_entidades_a_borrar;
CREATE TEMP TABLE _tmp_entidades_a_borrar AS
SELECT e.id
FROM public.entidades_territoriales e
WHERE DATE(e.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = '2026-08-03'
  AND NOT EXISTS (SELECT 1 FROM public.municipios m WHERE m.entidad_territorial_id = e.id)
  AND NOT EXISTS (SELECT 1 FROM public.region_entidades re WHERE re.entidad_territorial_id = e.id)
  AND NOT EXISTS (SELECT 1 FROM public.fichas_rlt f WHERE f.entidad_territorial = e.nombre)
  AND NOT EXISTS (SELECT 1 FROM public.ae_rectores_2025 r WHERE r.entidad_territorial = e.nombre);

SELECT 'Entidades territoriales importadas sin referencias (listas para borrar): ' || count(*) AS msg FROM _tmp_entidades_a_borrar;

DELETE FROM public.entidades_territoriales
WHERE id IN (SELECT id FROM _tmp_entidades_a_borrar);

-- ------------------------------------------------------------
-- 4. VERIFICACIÓN FINAL
-- ------------------------------------------------------------
SELECT '--- Totales después del rollback ---' AS msg;
SELECT 'Total instituciones: ' || count(*) AS msg FROM public.instituciones;
SELECT 'Total municipios: ' || count(*) AS msg FROM public.municipios;
SELECT 'Total entidades territoriales: ' || count(*) AS msg FROM public.entidades_territoriales;
SELECT 'Instituciones en Quibdó: ' || count(*) AS msg
FROM public.instituciones i
JOIN public.municipios m ON m.id = i.municipio_id
WHERE m.nombre ILIKE '%Quibd%';

COMMIT;

-- ============================================================
-- UNDO (ejecutar solo si es necesario)
-- ============================================================
/*
BEGIN;

INSERT INTO public.entidades_territoriales (id, nombre, created_at)
SELECT registro_id, nombre, creado_el
FROM public._undo_geo_import_20260803
WHERE tipo = 'entidad'
  AND NOT EXISTS (SELECT 1 FROM public.entidades_territoriales e WHERE e.id = registro_id);

INSERT INTO public.municipios (id, nombre, entidad_territorial_id, created_at)
SELECT registro_id, nombre, parent_id, creado_el
FROM public._undo_geo_import_20260803
WHERE tipo = 'municipio'
  AND NOT EXISTS (SELECT 1 FROM public.municipios m WHERE m.id = registro_id);

INSERT INTO public.instituciones (id, nombre, municipio_id, created_at)
SELECT registro_id, nombre, parent_id, creado_el
FROM public._undo_geo_import_20260803
WHERE tipo = 'institucion'
  AND NOT EXISTS (SELECT 1 FROM public.instituciones i WHERE i.id = registro_id);

INSERT INTO public.region_municipios (region_id, municipio_id)
SELECT region_id, child_id
FROM public._undo_geo_links_20260803
WHERE tipo = 'region_municipio'
  AND NOT EXISTS (
    SELECT 1 FROM public.region_municipios rm
    WHERE rm.region_id = region_id AND rm.municipio_id = child_id
  );

INSERT INTO public.region_instituciones (region_id, institucion_id)
SELECT region_id, child_id
FROM public._undo_geo_links_20260803
WHERE tipo = 'region_institucion'
  AND NOT EXISTS (
    SELECT 1 FROM public.region_instituciones ri
    WHERE ri.region_id = region_id AND ri.institucion_id = child_id
  );

COMMIT;
*/
