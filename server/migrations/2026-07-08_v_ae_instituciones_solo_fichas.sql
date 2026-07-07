-- =============================================================
-- Migration Render — 2026-07-08
-- Vue des instituciones par cohorte : source unique = fichas_rlt.
-- Supprime le UNION avec ae_cohorte_instituciones (legacy conservé
-- en base mais plus utilisé).
-- À exécuter manuellement sur la base Render (psql).
-- =============================================================

CREATE OR REPLACE VIEW public.v_ae_instituciones_por_cohorte AS
SELECT c.id AS cohorte_id, f.nombre_ie AS institucion_educativa
FROM public.ae_cohortes c
JOIN public.fichas_rlt f ON f.region = c.nombre
GROUP BY c.id, f.nombre_ie;

GRANT SELECT ON public.v_ae_instituciones_por_cohorte TO PUBLIC;

-- Vérification :
--   SELECT cohorte_id, count(*)
--   FROM public.v_ae_instituciones_por_cohorte
--   GROUP BY cohorte_id;
