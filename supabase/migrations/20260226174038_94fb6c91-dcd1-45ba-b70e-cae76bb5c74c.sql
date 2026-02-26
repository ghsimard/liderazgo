
ALTER TABLE public.fichas_rlt 
  ADD COLUMN codigo_pais_celular text NOT NULL DEFAULT '+57',
  ADD COLUMN codigo_pais_telefono_emergencia text DEFAULT '+57',
  ADD COLUMN codigo_pais_telefono_ie text DEFAULT '+57';
