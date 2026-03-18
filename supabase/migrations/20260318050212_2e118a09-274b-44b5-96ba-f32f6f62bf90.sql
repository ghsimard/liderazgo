UPDATE fichas_rlt
SET nombres = initcap(nombres),
    apellidos = initcap(apellidos),
    nombres_apellidos = initcap(nombres) || ' ' || initcap(apellidos)
WHERE nombres = upper(nombres) OR apellidos = upper(apellidos);