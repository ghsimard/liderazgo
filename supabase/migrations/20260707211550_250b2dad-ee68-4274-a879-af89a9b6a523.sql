CREATE OR REPLACE VIEW public.v_ae_instituciones_por_cohorte AS
SELECT c.id AS cohorte_id, f.nombre_ie AS institucion_educativa
FROM public.ae_cohortes c
JOIN public.fichas_rlt f ON f.region = c.nombre
GROUP BY c.id, f.nombre_ie;

ALTER VIEW public.v_ae_instituciones_por_cohorte SET (security_invoker = true);

GRANT SELECT ON public.v_ae_instituciones_por_cohorte TO authenticated, anon, service_role;