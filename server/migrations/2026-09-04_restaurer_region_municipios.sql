-- ============================================================
-- Restaurar los enlaces región -> municipio eliminados
-- ============================================================
-- Objetivo: recrear las filas de public.region_municipios para
-- Quibdó 2026 y Oriente 2026, de modo que los formularios RLT
-- vuelvan a ver las listas desplegables de municipios e IE.
--
-- Orden de ejecución:
--   1. Ejecutar todo el script en una transacción.
--   2. Revisar los mensajes de RAISE NOTICE.
--   3. Para deshacer, usar la sección UNDO al final.
-- ============================================================

BEGIN;

DROP TABLE IF EXISTS _undo_region_municipios_20260904;
CREATE TABLE _undo_region_municipios_20260904 AS
SELECT rm.*, now() AS backup_at
FROM public.region_municipios rm
WHERE rm.region_id IN (
  SELECT id FROM public.regiones WHERE nombre IN ('Quibdó 2026', 'Oriente 2026')
);

-- ------------------------------------------------------------
-- 1. Quibdó 2026 -> municipio de Quibdó
-- ------------------------------------------------------------
WITH quibdo_region AS (
  SELECT id FROM public.regiones WHERE nombre = 'Quibdó 2026' LIMIT 1
),
quibdo_mun AS (
  SELECT m.id
  FROM public.municipios m
  WHERE m.nombre ILIKE '%Quibd%'
  ORDER BY
    CASE WHEN m.nombre = 'Quibdó' THEN 0 ELSE 1 END,
    m.nombre
  LIMIT 1
)
INSERT INTO public.region_municipios (region_id, municipio_id)
SELECT r.id, m.id
FROM quibdo_region r, quibdo_mun m
WHERE NOT EXISTS (
  SELECT 1 FROM public.region_municipios rm
  WHERE rm.region_id = r.id AND rm.municipio_id = m.id
);

RAISE NOTICE 'Enlace Quibdó 2026 -> municipio creado (si no existía).';

-- ------------------------------------------------------------
-- 2. Oriente 2026 -> 11 municipios de Antioquia
-- ------------------------------------------------------------
WITH oriente AS (
  SELECT id FROM public.regiones WHERE nombre = 'Oriente 2026' LIMIT 1
),
munis AS (
  SELECT m.id
  FROM public.municipios m
  JOIN public.entidades_territoriales e ON e.id = m.entidad_territorial_id
  WHERE m.nombre IN (
    'El Retiro', 'La Ceja', 'El Carmen de Viboral', 'Marinilla',
    'El Santuario', 'San Rafael', 'San Carlos', 'San Luis',
    'El Peñol', 'Granada', 'San Vicente'
  )
  AND e.nombre ILIKE '%Antioquia%'
)
INSERT INTO public.region_municipios (region_id, municipio_id)
SELECT o.id, m.id
FROM oriente o, munis m
WHERE NOT EXISTS (
  SELECT 1 FROM public.region_municipios rm
  WHERE rm.region_id = o.id AND rm.municipio_id = m.id
);

RAISE NOTICE 'Enlaces Oriente 2026 -> municipios creados (si no existían).';

-- ------------------------------------------------------------
-- 3. Verificación
-- ------------------------------------------------------------
RAISE NOTICE '--- region_municipios para Quibdó 2026 / Oriente 2026 ---';
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT r.nombre AS region, count(rm.municipio_id) AS n_mun
    FROM public.regiones r
    LEFT JOIN public.region_municipios rm ON rm.region_id = r.id
    WHERE r.nombre IN ('Quibdó 2026', 'Oriente 2026')
    GROUP BY r.id, r.nombre
    ORDER BY r.nombre
  LOOP
    RAISE NOTICE '  %: % municipio(s)', rec.region, rec.n_mun;
  END LOOP;
END $$;

COMMIT;

-- ============================================================
-- UNDO
-- ============================================================
/*
BEGIN;
DELETE FROM public.region_municipios
WHERE region_id IN (
  SELECT id FROM public.regiones WHERE nombre IN ('Quibdó 2026', 'Oriente 2026')
);
INSERT INTO public.region_municipios (region_id, municipio_id)
SELECT region_id, municipio_id FROM _undo_region_municipios_20260904;
COMMIT;
*/
