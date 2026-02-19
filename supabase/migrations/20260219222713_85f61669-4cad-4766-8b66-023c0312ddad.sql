
ALTER TABLE public.fichas_rlt 
  ADD COLUMN IF NOT EXISTS nombres TEXT,
  ADD COLUMN IF NOT EXISTS apellidos TEXT;

UPDATE public.fichas_rlt
  SET nombres = split_part(nombres_apellidos, ' ', 1),
      apellidos = substring(nombres_apellidos FROM length(split_part(nombres_apellidos, ' ', 1)) + 2)
  WHERE nombres_apellidos IS NOT NULL;
