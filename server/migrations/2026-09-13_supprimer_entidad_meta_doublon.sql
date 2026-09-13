-- 2026-09-13 — Suppression de l'entité territoriale « META » créée en double par l'import CSV
--
-- Contexte :
--   « Meta »  (a3dd1595-9ca4-4b12-95f5-f2483f31ca5d, 21/02/2026) : 27 municipios, 0 institución — CONSERVADA
--   « META »  (6e1f9b90-87db-4bff-a3e6-ea5bcd694db9, 13/09/2026) : 26 municipios, 40 instituciones — ELIMINADA
--
-- Déjà appliqué sur la base Lovable Cloud. À rejouer tel quel sur toute autre base (Render) si nécessaire.

BEGIN;

-- ── 1. Sauvegarde ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public._undo_meta_delete_20260913_entidad AS
SELECT * FROM public.entidades_territoriales
WHERE id = '6e1f9b90-87db-4bff-a3e6-ea5bcd694db9';

CREATE TABLE IF NOT EXISTS public._undo_meta_delete_20260913_municipios AS
SELECT * FROM public.municipios
WHERE entidad_territorial_id = '6e1f9b90-87db-4bff-a3e6-ea5bcd694db9';

CREATE TABLE IF NOT EXISTS public._undo_meta_delete_20260913_instituciones AS
SELECT i.* FROM public.instituciones i
JOIN public.municipios m ON m.id = i.municipio_id
WHERE m.entidad_territorial_id = '6e1f9b90-87db-4bff-a3e6-ea5bcd694db9';

-- ── 2. Liens de région (aucun au moment de l'exécution, sécurité) ─────────────
DELETE FROM public.region_instituciones ri
USING public.instituciones i, public.municipios m
WHERE ri.institucion_id = i.id
  AND i.municipio_id = m.id
  AND m.entidad_territorial_id = '6e1f9b90-87db-4bff-a3e6-ea5bcd694db9';

DELETE FROM public.region_municipios rm
USING public.municipios m
WHERE rm.municipio_id = m.id
  AND m.entidad_territorial_id = '6e1f9b90-87db-4bff-a3e6-ea5bcd694db9';

DELETE FROM public.region_entidades
WHERE entidad_territorial_id = '6e1f9b90-87db-4bff-a3e6-ea5bcd694db9';

-- ── 3. Suppression en cascade manuelle ────────────────────────────────────────
DELETE FROM public.instituciones i
USING public.municipios m
WHERE m.id = i.municipio_id
  AND m.entidad_territorial_id = '6e1f9b90-87db-4bff-a3e6-ea5bcd694db9';

DELETE FROM public.municipios
WHERE entidad_territorial_id = '6e1f9b90-87db-4bff-a3e6-ea5bcd694db9';

DELETE FROM public.entidades_territoriales
WHERE id = '6e1f9b90-87db-4bff-a3e6-ea5bcd694db9';

COMMIT;

-- ── 4. Vérification (attendu : une seule ligne « Meta », 27 municipios, 0 escuelas) ──
-- SELECT et.id, et.nombre, count(DISTINCT m.id) AS municipios, count(DISTINCT i.id) AS escuelas
-- FROM public.entidades_territoriales et
-- LEFT JOIN public.municipios m ON m.entidad_territorial_id = et.id
-- LEFT JOIN public.instituciones i ON i.municipio_id = m.id
-- WHERE lower(trim(et.nombre)) = 'meta'
-- GROUP BY et.id, et.nombre;

-- ── 5. Contrôle global des doublons de noms (attendu : 0 ligne) ───────────────
-- SELECT lower(regexp_replace(trim(nombre), '\s+', ' ', 'g')) AS clave,
--        count(*) AS n, string_agg(nombre, ' | ') AS variantes
-- FROM public.entidades_territoriales GROUP BY 1 HAVING count(*) > 1;

-- ── 6. UNDO (restauration complète) ───────────────────────────────────────────
-- BEGIN;
-- INSERT INTO public.entidades_territoriales SELECT * FROM public._undo_meta_delete_20260913_entidad;
-- INSERT INTO public.municipios            SELECT * FROM public._undo_meta_delete_20260913_municipios;
-- INSERT INTO public.instituciones         SELECT * FROM public._undo_meta_delete_20260913_instituciones;
-- COMMIT;
