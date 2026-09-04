-- ============================================================
-- Restauration : Satisfacción / Intensivo / Logística
-- Annule intégralement la correction du 29 août 2026
-- (2026-08-29_satisfaccion_logistica_1_a_4.sql) et remet les
-- réponses exactement telles qu'elles ont été soumises.
-- Effet attendu : Quibdó module 3 retrouve Logística = 73,33 %
-- et satisfaction générale = 90,78 % (rapport déjà envoyé).
-- Exécuter manuellement en production.
-- ============================================================

BEGIN;

-- 1) Restauration des valeurs d'origine depuis la sauvegarde
UPDATE satisfaccion_responses r
SET respuestas = b.respuestas_original
FROM _undo_satisfaccion_logistica_20260829 b
WHERE r.id = b.id;

COMMIT;

-- 2) Vérification (après le COMMIT)
--    Résultat attendu : plus aucune valeur "1" ne manque ;
--    pour Quibdó module 3, on doit revoir des "1" dans la
--    distribution ci-dessous.
-- SELECT r.region, r.module_number, e.v AS valor, count(*)
-- FROM satisfaccion_responses r
-- JOIN _undo_satisfaccion_logistica_20260829 b ON b.id = r.id,
--      jsonb_each_text(r.respuestas->'logistica') AS e(k, v)
-- WHERE r.form_type = 'intensivo' AND r.module_number IN (3, 4)
-- GROUP BY 1, 2, 3
-- ORDER BY 1, 2, 3;

-- ============================================================
-- UNDO de cette restauration (réappliquer le 1 -> 4, si besoin) :
-- BEGIN;
-- UPDATE satisfaccion_responses r
-- SET respuestas = jsonb_set(
--       r.respuestas,
--       '{logistica}',
--       (SELECT jsonb_object_agg(e.k, CASE WHEN e.v = '1' THEN '4' ELSE e.v END)
--        FROM jsonb_each_text(r.respuestas->'logistica') AS e(k, v))
--     )
-- FROM _undo_satisfaccion_logistica_20260829 b
-- WHERE r.id = b.id
--   AND EXISTS (
--     SELECT 1 FROM jsonb_each_text(r.respuestas->'logistica') AS e(k, v)
--     WHERE e.v = '1'
--   );
-- COMMIT;
-- ============================================================

-- ============================================================
-- Étape 4 (diagnostic, lecture seule) : quelles autres régions
-- et modules ont été touchés par la correction du 29 août ?
-- SELECT r.region, r.module_number, r.cedula, r.created_at,
--        b.respuestas_original->'logistica' AS logistica_origine
-- FROM _undo_satisfaccion_logistica_20260829 b
-- JOIN satisfaccion_responses r ON r.id = b.id
-- ORDER BY r.region, r.module_number, r.created_at;
-- ============================================================
