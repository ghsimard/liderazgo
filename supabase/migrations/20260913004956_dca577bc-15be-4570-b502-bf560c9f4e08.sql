CREATE TABLE public._undo_meta_delete_20260913_entidad AS
SELECT * FROM public.entidades_territoriales
WHERE id = '6e1f9b90-87db-4bff-a3e6-ea5bcd694db9';

CREATE TABLE public._undo_meta_delete_20260913_municipios AS
SELECT * FROM public.municipios
WHERE entidad_territorial_id = '6e1f9b90-87db-4bff-a3e6-ea5bcd694db9';

CREATE TABLE public._undo_meta_delete_20260913_instituciones AS
SELECT i.* FROM public.instituciones i
JOIN public.municipios m ON m.id = i.municipio_id
WHERE m.entidad_territorial_id = '6e1f9b90-87db-4bff-a3e6-ea5bcd694db9';

GRANT ALL ON public._undo_meta_delete_20260913_entidad TO service_role;
GRANT ALL ON public._undo_meta_delete_20260913_municipios TO service_role;
GRANT ALL ON public._undo_meta_delete_20260913_instituciones TO service_role;

ALTER TABLE public._undo_meta_delete_20260913_entidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._undo_meta_delete_20260913_municipios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._undo_meta_delete_20260913_instituciones ENABLE ROW LEVEL SECURITY;