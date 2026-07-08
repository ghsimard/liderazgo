## Diagnostic confirmé

Votre capture montre exactement la cause :

| institucion_educativa | count |
|---|---|
| Centro Educativo Rural Guamito | 1 |
| Centro Educativo Rural Guamito - San Luis | 20 |

Les 20 respuestas docentes ont été enregistrées avec le nom **long** (« - San Luis »), qui provenait du dropdown avant la migration 08c. Depuis 08c, la vue `v_ae_instituciones_por_cohorte` affiche le nom **court** (celui de `fichas_rlt`). Le Monitor agrège par nom exact → il montre la ligne « Centro Educativo Rural Guamito » avec seulement **1 docente**, et les 20 autres respuestas restent orphelines (leur nom n'existe plus dans la vue).

`fichas_rlt` n'est pas touchée (règle mémoire respectée).

## Correction proposée

Aligner les respuestas orphelines sur le nom canonique de `fichas_rlt`, uniquement quand la version courte y existe déjà (100 % sûr, pas de doublons créés).

### 🗄️ Base de données (SQL manuel Render) — une seule transaction

```sql
BEGIN;

-- Aperçu (facultatif, à exécuter avant COMMIT pour vérifier la liste)
WITH candidats AS (
  SELECT DISTINCT e.institucion_educativa AS ancien,
         regexp_replace(e.institucion_educativa, '\s+-\s+[^-]+$', '') AS nouveau
  FROM encuestas_ambiente_escolar e
  WHERE e.institucion_educativa ~ '\s+-\s+[^-]+$'
)
SELECT c.ancien, c.nouveau, count(*) AS respuestas
FROM encuestas_ambiente_escolar e
JOIN candidats c ON e.institucion_educativa = c.ancien
WHERE EXISTS (SELECT 1 FROM fichas_rlt f WHERE f.nombre_ie = c.nouveau)
GROUP BY c.ancien, c.nouveau
ORDER BY c.ancien;

-- Correction
WITH candidats AS (
  SELECT DISTINCT e.institucion_educativa AS ancien,
         regexp_replace(e.institucion_educativa, '\s+-\s+[^-]+$', '') AS nouveau
  FROM encuestas_ambiente_escolar e
  WHERE e.institucion_educativa ~ '\s+-\s+[^-]+$'
)
UPDATE encuestas_ambiente_escolar e
SET institucion_educativa = c.nouveau
FROM candidats c
WHERE e.institucion_educativa = c.ancien
  AND EXISTS (SELECT 1 FROM fichas_rlt f WHERE f.nombre_ie = c.nouveau);

COMMIT;
```

### 🖥️ Site statique — aucune modification de code

Un simple Ctrl+Shift+R sur le Monitor Ambiente Escolar après le COMMIT suffit à voir la ligne « Centro Educativo Rural Guamito » passer à **21 docentes**.

### ⚙️ Web Service — aucune action

## Vérification post-migration

```sql
SELECT institucion_educativa, tipo_formulario, count(*)
FROM encuestas_ambiente_escolar
WHERE institucion_educativa ILIKE '%guamito%'
GROUP BY 1,2 ORDER BY 1,2;
```

Attendu : une seule ligne « Centro Educativo Rural Guamito / docentes / 21 ».

## Étapes utilisateur

1. 🗄️ Exécuter le bloc SQL d'aperçu pour valider la liste des IE affectées.
2. 🗄️ Si la liste convient, exécuter le `UPDATE` puis `COMMIT`.
3. 🖥️ Ctrl+Shift+R sur `/admin?tab=ambiente-escolar`.
4. 🗄️ Exécuter la vérification post-migration pour confirmer.
