-- =============================================================
-- Migration Render — 2026-07-08
-- Normaliser institucion_educativa dans les tables
-- ae_*_submissions_2025 : retirer le suffixe « - Municipio »
-- lorsque la version courte existe dans fichas_rlt.nombre_ie.
-- À exécuter manuellement sur la base Render (psql) ET sur Lovable Cloud.
-- Idempotent, sûr, ne modifie que les lignes résolvables.
-- =============================================================

BEGIN;

-- Aperçu (à consulter avant COMMIT si exécuté interactivement)
SELECT 'docentes' src, s.institucion_educativa AS avant,
       split_part(s.institucion_educativa, ' - ', 1) AS apres,
       count(*) AS n
FROM public.ae_docentes_submissions_2025 s
WHERE s.institucion_educativa LIKE '% - %'
  AND EXISTS (
    SELECT 1 FROM public.fichas_rlt f
    WHERE f.nombre_ie = split_part(s.institucion_educativa, ' - ', 1)
  )
GROUP BY s.institucion_educativa
UNION ALL
SELECT 'estudiantes', s.institucion_educativa,
       split_part(s.institucion_educativa, ' - ', 1), count(*)
FROM public.ae_estudiantes_submissions_2025 s
WHERE s.institucion_educativa LIKE '% - %'
  AND EXISTS (
    SELECT 1 FROM public.fichas_rlt f
    WHERE f.nombre_ie = split_part(s.institucion_educativa, ' - ', 1)
  )
GROUP BY s.institucion_educativa
UNION ALL
SELECT 'acudientes', s.institucion_educativa,
       split_part(s.institucion_educativa, ' - ', 1), count(*)
FROM public.ae_acudientes_submissions_2025 s
WHERE s.institucion_educativa LIKE '% - %'
  AND EXISTS (
    SELECT 1 FROM public.fichas_rlt f
    WHERE f.nombre_ie = split_part(s.institucion_educativa, ' - ', 1)
  )
GROUP BY s.institucion_educativa
ORDER BY src, avant;

-- Application
UPDATE public.ae_docentes_submissions_2025 s
SET institucion_educativa = split_part(s.institucion_educativa, ' - ', 1)
WHERE s.institucion_educativa LIKE '% - %'
  AND EXISTS (
    SELECT 1 FROM public.fichas_rlt f
    WHERE f.nombre_ie = split_part(s.institucion_educativa, ' - ', 1)
  );

UPDATE public.ae_estudiantes_submissions_2025 s
SET institucion_educativa = split_part(s.institucion_educativa, ' - ', 1)
WHERE s.institucion_educativa LIKE '% - %'
  AND EXISTS (
    SELECT 1 FROM public.fichas_rlt f
    WHERE f.nombre_ie = split_part(s.institucion_educativa, ' - ', 1)
  );

UPDATE public.ae_acudientes_submissions_2025 s
SET institucion_educativa = split_part(s.institucion_educativa, ' - ', 1)
WHERE s.institucion_educativa LIKE '% - %'
  AND EXISTS (
    SELECT 1 FROM public.fichas_rlt f
    WHERE f.nombre_ie = split_part(s.institucion_educativa, ' - ', 1)
  );

-- Vérification finale
SELECT 'reste_docentes' src, count(*) FROM public.ae_docentes_submissions_2025
WHERE institucion_educativa LIKE '% - %'
UNION ALL SELECT 'reste_estudiantes', count(*) FROM public.ae_estudiantes_submissions_2025
WHERE institucion_educativa LIKE '% - %'
UNION ALL SELECT 'reste_acudientes', count(*) FROM public.ae_acudientes_submissions_2025
WHERE institucion_educativa LIKE '% - %';

COMMIT;
