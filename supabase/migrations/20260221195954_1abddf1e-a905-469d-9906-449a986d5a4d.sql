
-- Add new columns to fichas_rlt
ALTER TABLE public.fichas_rlt ADD COLUMN genero text;
ALTER TABLE public.fichas_rlt ADD COLUMN numero_cedula text;
ALTER TABLE public.fichas_rlt ADD COLUMN lugar_nacimiento text;
ALTER TABLE public.fichas_rlt ADD COLUMN direccion_sede_principal text;
ALTER TABLE public.fichas_rlt ADD COLUMN sitio_web text;
ALTER TABLE public.fichas_rlt ADD COLUMN telefono_ie text;
ALTER TABLE public.fichas_rlt ADD COLUMN estudiantes_basica_secundaria integer;
ALTER TABLE public.fichas_rlt ADD COLUMN estudiantes_media integer;
