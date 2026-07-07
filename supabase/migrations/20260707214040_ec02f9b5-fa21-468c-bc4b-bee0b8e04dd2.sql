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