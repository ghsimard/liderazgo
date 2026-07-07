-- =============================================================
-- Migration Render — 2026-07-07
-- Vue unifiée des instituciones par cohorte Ambiente Escolar.
-- Source primaire : fichas_rlt (par région) + legacy ae_cohorte_instituciones.
-- À exécuter manuellement sur la base Render (psql).
-- =============================================================

CREATE OR REPLACE VIEW public.v_ae_instituciones_por_cohorte AS
SELECT c.id AS cohorte_id, f.nombre_ie AS institucion_educativa
FROM public.ae_cohortes c
JOIN public.fichas_rlt f ON f.region = c.nombre
UNION
SELECT cohorte_id, institucion_educativa
FROM public.ae_cohorte_instituciones;

GRANT SELECT ON public.v_ae_instituciones_por_cohorte TO PUBLIC;

-- Vérification :
--   SELECT cohorte_id, count(*)
--   FROM public.v_ae_instituciones_por_cohorte
--   GROUP BY cohorte_id;
