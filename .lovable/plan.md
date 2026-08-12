# Requalification SQL des réponses mal étiquetées — avec undo

Concerne deux écoles (extensible) :
- Institución Educativa Normal Superior de María
- Institución Educativa Concejo Municipal El Porvenir

Oui, un undo est possible : on crée une **table de sauvegarde** avant l'UPDATE, qui conserve l'ancienne `fase` et l'ancien `cohorte_id` de chaque ligne modifiée. Tant que cette table existe, la restauration est exacte.

Note : dans la base de développement, El Porvenir n'a que des réponses 2025 (`linea_base`, cohorte Rionegro 2025). Le périmètre exact doit donc être confirmé en production à l'étape 0 avant tout UPDATE.

## Étape 0 — Contrôle du périmètre (aucune modification)

```sql
SELECT institucion_educativa, fase, cohorte_id,
       date_part('year', created_at) AS anio,
       count(*) AS n,
       min(created_at AT TIME ZONE 'America/Bogota') AS mas_antigua,
       max(created_at AT TIME ZONE 'America/Bogota') AS mas_reciente
FROM encuestas_ambiente_escolar
WHERE institucion_educativa ILIKE '%Normal Superior de Mar%'
   OR institucion_educativa ILIKE '%Concejo Municipal El Porvenir%'
GROUP BY 1,2,3,4
ORDER BY 1,4,2;
```

Vérifier, pour chaque école, le nombre de lignes 2026 en `linea_base` à requalifier.

## Étape 1 — Sauvegarde + requalification (transaction unique)

Remplacer `<COHORTE_CIERRE_ID>` par l'id de la cohorte cible (Rionegro 2025 : celui déjà utilisé par les réponses `cierre`).

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS _undo_ae_fase_20260812 (
  id uuid PRIMARY KEY,
  old_fase text,
  old_cohorte_id uuid,
  saved_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO _undo_ae_fase_20260812 (id, old_fase, old_cohorte_id)
SELECT id, fase, cohorte_id
FROM encuestas_ambiente_escolar
WHERE (institucion_educativa ILIKE '%Normal Superior de Mar%'
    OR institucion_educativa ILIKE '%Concejo Municipal El Porvenir%')
  AND created_at >= '2026-01-01'
  AND fase = 'linea_base'
ON CONFLICT (id) DO NOTHING;

UPDATE encuestas_ambiente_escolar e
SET fase = 'cierre',
    cohorte_id = '<COHORTE_CIERRE_ID>'::uuid
FROM _undo_ae_fase_20260812 u
WHERE e.id = u.id;

-- Contrôle avant validation
SELECT institucion_educativa, fase, cohorte_id, count(*)
FROM encuestas_ambiente_escolar
WHERE (institucion_educativa ILIKE '%Normal Superior de Mar%'
    OR institucion_educativa ILIKE '%Concejo Municipal El Porvenir%')
  AND created_at >= '2026-01-01'
GROUP BY 1,2,3;

COMMIT;  -- ou ROLLBACK; si le contrôle est incorrect
```

## Étape 2 — Undo (à tout moment tant que la table de sauvegarde existe)

```sql
BEGIN;

UPDATE encuestas_ambiente_escolar e
SET fase = u.old_fase,
    cohorte_id = u.old_cohorte_id
FROM _undo_ae_fase_20260812 u
WHERE e.id = u.id;

SELECT institucion_educativa, fase, count(*)
FROM encuestas_ambiente_escolar
WHERE (institucion_educativa ILIKE '%Normal Superior de Mar%'
    OR institucion_educativa ILIKE '%Concejo Municipal El Porvenir%')
  AND created_at >= '2026-01-01'
GROUP BY 1,2;

COMMIT;
```

Nettoyage seulement une fois le résultat validé et définitif :

```sql
DROP TABLE _undo_ae_fase_20260812;
```

Pour ajouter une autre école plus tard : reprendre les mêmes blocs en ajoutant un `OR institucion_educativa ILIKE '%…%'` dans chaque clause `WHERE`. L'undo reste valable puisque la sauvegarde s'accumule dans la même table (`ON CONFLICT DO NOTHING` protège les valeurs d'origine).

## Point d'amont à vérifier après coup

La phase enregistrée provient de la **campagne active** (`ae_campanas`) au moment de la soumission, pas d'un choix de l'utilisateur. Sans correction de la campagne, les prochaines réponses de ces écoles repartiront en `linea_base`.

```sql
SELECT c.id, c.nombre, c.fase, c.fecha_inicio, c.fecha_fin, co.nombre AS cohorte
FROM ae_campanas c JOIN ae_cohortes co ON co.id = c.cohorte_id
ORDER BY c.fecha_inicio DESC;
```

## Actions Render

- 🖥️ Site statique (Frontend) : rien
- ⚙️ Web Service (Backend Express) : rien
- 🗄️ Base de données (SQL manuel) : Étape 0 puis Étape 1 (Étape 2 en cas d'undo)
