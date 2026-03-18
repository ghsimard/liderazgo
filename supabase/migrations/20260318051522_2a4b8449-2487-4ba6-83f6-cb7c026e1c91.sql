UPDATE fichas_rlt
SET nombres = initcap(trim(regexp_replace(nombres, '\s+', ' ', 'g'))),
    apellidos = initcap(trim(regexp_replace(apellidos, '\s+', ' ', 'g'))),
    nombres_apellidos = initcap(trim(regexp_replace(nombres, '\s+', ' ', 'g'))) || ' ' || initcap(trim(regexp_replace(apellidos, '\s+', ' ', 'g')))
WHERE nombres ~ '\s{2,}' OR apellidos ~ '\s{2,}';