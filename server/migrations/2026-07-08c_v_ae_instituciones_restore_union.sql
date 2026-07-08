-- =============================================================
-- Migration Render — 2026-07-08c
-- Restaure le UNION avec ae_cohorte_instituciones (nécessaire
-- pour Medellín 2025, Itagüí 2025 et Rionegro 2025 dont les
-- fichas_rlt.region ne correspondent pas au nom de la cohorte).
--
-- Étape 1 : normaliser les suffixes " - Municipio" dans
--           ae_cohorte_instituciones SEULEMENT quand la version
--           courte existe déjà dans fichas_rlt (évite les doublons).
--           fichas_rlt N'EST PAS MODIFIÉE.
-- Étape 2 : recréer la vue avec UNION restauré.
--
-- À exécuter manuellement sur la base Render (psql).
-- =============================================================

BEGIN;

UPDATE ae_cohorte_instituciones aci
SET institucion_educativa = regexp_replace(aci.institucion_educativa, '\s+-\s+[^-]+$', '')
WHERE EXISTS (
  SELECT 1 FROM fichas_rlt f
  WHERE f.nombre_ie = regexp_replace(aci.institucion_educativa, '\s+-\s+[^-]+$', '')
);

CREATE OR REPLACE VIEW public.v_ae_instituciones_por_cohorte AS
SELECT c.id AS cohorte_id, f.nombre_ie AS institucion_educativa
FROM public.ae_cohortes c
JOIN public.fichas_rlt f ON f.region = c.nombre
UNION
SELECT cohorte_id, institucion_educativa
FROM public.ae_cohorte_instituciones;

GRANT SELECT ON public.v_ae_instituciones_por_cohorte TO PUBLIC;

COMMIT;

-- Vérifications :
--   SELECT c.nombre, count(*) AS n
--   FROM v_ae_instituciones_por_cohorte v
--   JOIN ae_cohortes c ON c.id = v.cohorte_id
--   GROUP BY c.nombre ORDER BY c.nombre;
--
--   SELECT institucion_educativa, count(*)
--   FROM v_ae_instituciones_por_cohorte
--   WHERE institucion_educativa ILIKE '%guamito%'
--   GROUP BY institucion_educativa HAVING count(*) > 1;
