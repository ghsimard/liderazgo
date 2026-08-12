# Requalification SQL des réponses 2026 mal étiquetées — avec undo

Périmètre confirmé par votre requête de production :

| Institution | 2026 `cierre` (Rionegro 2025) | 2026 `linea_base` (Oriente 2026) → à requalifier |
|---|---|---|
| Concejo Municipal El Porvenir | 35 | **63** |
| Normal Superior de María | 6 | **55** |

Total à modifier : **118 lignes**. Les réponses 2025 (`linea_base`, 102 + 90) ne sont pas touchées (filtre `created_at >= '2026-01-01'`).

Cohorte cible : `1724cd6d-c72d-49b2-94e0-6d96948c3a1e` (Rionegro 2025).

Oui, un undo est possible : une **table de sauvegarde** conserve l'ancienne `fase` et l'ancien `cohorte_id` de chaque ligne modifiée avant l'UPDATE. Tant que cette table existe, la restauration est exacte.

## Étape 1 — Sauvegarde + requalification (transaction unique)

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
-- attendu : INSERT 0 118

UPDATE encuestas_ambiente_escolar e
SET fase = 'cierre',
    cohorte_id = '1724cd6d-c72d-49b2-94e0-6d96948c3a1e'::uuid
FROM _undo_ae_fase_20260812 u
WHERE e.id = u.id;
-- attendu : UPDATE 118

-- Contrôle avant validation
SELECT institucion_educativa, fase, cohorte_id, count(*)
FROM encuestas_ambiente_escolar
WHERE (institucion_educativa ILIKE '%Normal Superior de Mar%'
    OR institucion_educativa ILIKE '%Concejo Municipal El Porvenir%')
  AND created_at >= '2026-01-01'
GROUP BY 1,2,3;

COMMIT;  -- ou ROLLBACK; si les comptes ne correspondent pas
```

Attendu après COMMIT, tout en cohorte Rionegro 2025 : El Porvenir **98** en `cierre`, Normal Superior de María **61** en `cierre`.

## Étape 2 — Undo (à tout moment tant que la table de sauvegarde existe)

```sql
BEGIN;

UPDATE encuestas_ambiente_escolar e
SET fase = u.old_fase,
    cohorte_id = u.old_cohorte_id
FROM _undo_ae_fase_20260812 u
WHERE e.id = u.id;

SELECT institucion_educativa, fase, cohorte_id, count(*)
FROM encuestas_ambiente_escolar
WHERE (institucion_educativa ILIKE '%Normal Superior de Mar%'
    OR institucion_educativa ILIKE '%Concejo Municipal El Porvenir%')
  AND created_at >= '2026-01-01'
GROUP BY 1,2,3;

COMMIT;
```

Nettoyage uniquement une fois le résultat validé et définitif :

```sql
DROP TABLE _undo_ae_fase_20260812;
```

Pour une école supplémentaire plus tard : ajouter un `OR institucion_educativa ILIKE '%…%'` dans chaque clause `WHERE`. La sauvegarde s'accumule dans la même table, et `ON CONFLICT DO NOTHING` protège les valeurs d'origine déjà enregistrées.

## Point d'amont à corriger ensuite

La phase enregistrée vient de la **campagne active** (`ae_campanas`) au moment de la soumission. Sans correction, les prochaines réponses de ces écoles repartiront en `linea_base` / Oriente 2026.

```sql
SELECT c.id, c.nombre, c.fase, c.fecha_inicio, c.fecha_fin, co.nombre AS cohorte
FROM ae_campanas c JOIN ae_cohortes co ON co.id = c.cohorte_id
ORDER BY c.fecha_inicio DESC;
```

## Actions Render

- 🖥️ Site statique (Frontend) : rien
- ⚙️ Web Service (Backend Express) : rien
- 🗄️ Base de données (SQL manuel) : Étape 1 (Étape 2 en cas d'undo)
