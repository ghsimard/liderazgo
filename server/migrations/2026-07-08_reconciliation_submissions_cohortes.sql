-- =============================================================
-- Migration Render — 2026-07-08
-- Réconciliation submissions ↔ cohortes Ambiente Escolar 2025.
-- Objectif : toutes les encuestas comptabilisées dans la bonne cohorte.
-- À exécuter manuellement sur la base Render (psql).
-- =============================================================

BEGIN;

-- ---------------------------------------------------------------
-- Bloc 1 : ajouter 3 IE manquantes à la cohorte Medellín 2025
-- ---------------------------------------------------------------
INSERT INTO public.ae_cohorte_instituciones (cohorte_id, institucion_educativa)
VALUES
  ('c25708c1-54f7-4044-96bc-7d15bf449d4f', 'Institución Educativa Bello Horizonte'),
  ('c25708c1-54f7-4044-96bc-7d15bf449d4f', 'Institución Educativa El Diamante'),
  ('c25708c1-54f7-4044-96bc-7d15bf449d4f', 'Institución Educativa Ciudad Don Bosco')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------
-- Bloc 2 : corriger l'entidad territorial NULL pour El Diamante
-- ---------------------------------------------------------------
UPDATE public.ae_rectores_2025
SET entidad_territorial = 'Medellín'
WHERE nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ ILIKE '%El Diamante%'
  AND entidad_territorial IS NULL;

-- ---------------------------------------------------------------
-- Bloc 3 : corriger typo "Manuel Uribe Angel" → "Manuel Uribe Ángel"
-- ---------------------------------------------------------------
UPDATE public.ae_docentes_submissions_2025
SET institucion_educativa = 'institución Educativa Manuel Uribe Ángel'
WHERE institucion_educativa = 'institución Educativa Manuel Uribe Angel';

UPDATE public.ae_estudiantes_submissions_2025
SET institucion_educativa = 'institución Educativa Manuel Uribe Ángel'
WHERE institucion_educativa = 'institución Educativa Manuel Uribe Angel';

UPDATE public.ae_acudientes_submissions_2025
SET institucion_educativa = 'institución Educativa Manuel Uribe Ángel'
WHERE institucion_educativa = 'institución Educativa Manuel Uribe Angel';

-- ---------------------------------------------------------------
-- Bloc 3b : supprimer la ligne aberrante (nom de personne dans IE)
-- ---------------------------------------------------------------
DELETE FROM public.ae_docentes_submissions_2025
WHERE btrim(institucion_educativa) = 'César Fernando Trujillo Múnera';

-- ---------------------------------------------------------------
-- Bloc 4 : rétablir la vue hybride (fichas_rlt UNION ae_cohorte_instituciones)
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_ae_instituciones_por_cohorte AS
SELECT c.id AS cohorte_id, f.nombre_ie AS institucion_educativa
FROM public.ae_cohortes c
JOIN public.fichas_rlt f ON f.region = c.nombre
UNION
SELECT cohorte_id, institucion_educativa
FROM public.ae_cohorte_instituciones;

GRANT SELECT ON public.v_ae_instituciones_por_cohorte TO PUBLIC;

COMMIT;

-- ---------------------------------------------------------------
-- Vérification :
--   SELECT count(*) FROM public.v_ae_instituciones_por_cohorte
--   WHERE cohorte_id = 'c25708c1-54f7-4044-96bc-7d15bf449d4f';  -- attendu : 67
--
--   SELECT DISTINCT s.institucion_educativa
--   FROM public.ae_docentes_submissions_2025 s
--   LEFT JOIN public.ae_cohorte_instituciones c
--     ON c.institucion_educativa = s.institucion_educativa
--   WHERE c.cohorte_id IS NULL AND s.institucion_educativa IS NOT NULL;
--   (idem estudiantes, acudientes) — attendu : 0 lignes
-- ---------------------------------------------------------------
