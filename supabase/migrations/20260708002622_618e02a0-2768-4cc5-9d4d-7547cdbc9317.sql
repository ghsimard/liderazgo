
CREATE OR REPLACE VIEW public.v_ae_instituciones_por_cohorte AS
SELECT c.id AS cohorte_id, f.nombre_ie AS institucion_educativa
FROM public.ae_cohortes c
JOIN public.fichas_rlt f ON f.region = c.nombre
UNION
SELECT cohorte_id, institucion_educativa
FROM public.ae_cohorte_instituciones;

GRANT SELECT ON public.v_ae_instituciones_por_cohorte TO PUBLIC;
