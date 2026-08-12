-- =============================================================
-- Migration Render — 2026-08-12
-- Normalisation des phases Ambiente Escolar pour 2 écoles :
--   2025 -> 'linea_base' (Inicial)
--   2026 -> 'cierre'     (Evolución)
--   cohorte -> Rionegro 2025 (1724cd6d-c72d-49b2-94e0-6d96948c3a1e)
--
-- Écoles : Concejo Municipal El Porvenir, Normal Superior de María
-- Undo possible via la table _undo_ae_fase_20260812 (voir bas du fichier).
-- À exécuter manuellement sur la base Render (psql).
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS _undo_ae_fase_20260812 (
  id uuid PRIMARY KEY,
  old_fase text,
  old_cohorte_id uuid,
  saved_at timestamptz NOT NULL DEFAULT now()
);

-- Sauvegarde des lignes non conformes
INSERT INTO _undo_ae_fase_20260812 (id, old_fase, old_cohorte_id)
SELECT id, fase, cohorte_id
FROM encuestas_ambiente_escolar
WHERE (institucion_educativa ILIKE '%Normal Superior de Mar%'
    OR institucion_educativa ILIKE '%Concejo Municipal El Porvenir%')
  AND (
    fase IS DISTINCT FROM (CASE WHEN created_at >= '2026-01-01' THEN 'cierre' ELSE 'linea_base' END)
    OR cohorte_id IS DISTINCT FROM '1724cd6d-c72d-49b2-94e0-6d96948c3a1e'::uuid
  )
ON CONFLICT (id) DO NOTHING;
-- attendu : INSERT 0 118

UPDATE encuestas_ambiente_escolar e
SET fase = CASE WHEN e.created_at >= '2026-01-01' THEN 'cierre' ELSE 'linea_base' END,
    cohorte_id = '1724cd6d-c72d-49b2-94e0-6d96948c3a1e'::uuid
FROM _undo_ae_fase_20260812 u
WHERE e.id = u.id;
-- attendu : UPDATE 118

-- Contrôle avant validation
SELECT institucion_educativa,
       date_part('year', created_at) AS anio,
       fase, cohorte_id, count(*)
FROM encuestas_ambiente_escolar
WHERE institucion_educativa ILIKE '%Normal Superior de Mar%'
   OR institucion_educativa ILIKE '%Concejo Municipal El Porvenir%'
GROUP BY 1,2,3,4
ORDER BY 1,2,3;
-- attendu : 4 lignes, cohorte Rionegro 2025
--   El Porvenir      2025 linea_base 102 | 2026 cierre 98
--   Normal Superior  2025 linea_base  90 | 2026 cierre 61

COMMIT;  -- ou ROLLBACK; si les comptes ne correspondent pas

-- =============================================================
-- UNDO (tant que _undo_ae_fase_20260812 existe)
-- =============================================================
-- BEGIN;
-- UPDATE encuestas_ambiente_escolar e
-- SET fase = u.old_fase, cohorte_id = u.old_cohorte_id
-- FROM _undo_ae_fase_20260812 u
-- WHERE e.id = u.id;
-- COMMIT;
--
-- Nettoyage définitif :
--   DROP TABLE _undo_ae_fase_20260812;
