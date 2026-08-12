# Règle cible pour les deux écoles : 2025 = Inicial, 2026 = Evolución

Écoles concernées :
- Institución Educativa Concejo Municipal El Porvenir
- Institución Educativa Normal Superior de María

État actuel en production :

| Institution | Année | fase | cohorte | n | Action |
|---|---|---|---|---|---|
| El Porvenir | 2025 | linea_base | Rionegro 2025 | 102 | conforme |
| El Porvenir | 2026 | cierre | Rionegro 2025 | 35 | conforme |
| El Porvenir | 2026 | linea_base | Oriente 2026 | 63 | **à requalifier** |
| Normal Superior | 2025 | linea_base | Rionegro 2025 | 90 | conforme |
| Normal Superior | 2026 | cierre | Rionegro 2025 | 6 | conforme |
| Normal Superior | 2026 | linea_base | Oriente 2026 | 55 | **à requalifier** |

Après correction : 2025 → `linea_base` (Inicial) et 2026 → `cierre` (Evolución), tout sur la cohorte **Rionegro 2025** (`1724cd6d-c72d-49b2-94e0-6d96948c3a1e`).

Résultat attendu : El Porvenir 102 Inicial / 98 Evolución — Normal Superior 90 Inicial / 61 Evolución.

Un undo reste possible : une **table de sauvegarde** conserve l'ancienne `fase` et l'ancien `cohorte_id` de chaque ligne modifiée.

## Étape 1 — Sauvegarde + normalisation (transaction unique)

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS _undo_ae_fase_20260812 (
  id uuid PRIMARY KEY,
  old_fase text,
  old_cohorte_id uuid,
  saved_at timestamptz NOT NULL DEFAULT now()
);

-- Sauvegarde de TOUTES les lignes des deux écoles qui ne sont pas déjà conformes
INSERT INTO _undo_ae_fase_20260812 (id, old_fase, old_cohorte_id)
SELECT id, fase, cohorte_id
FROM encuestas_ambiente_escolar
WHERE (institucion_educativa ILIKE '%Normal Superior de Mar%'
    OR institucion_educativa ILIKE '%Concejo Municipal El Porvenir%')
  AND (
    fase IS DISTINCT FROM (CASE WHEN created_at >= '2026-01-01' THEN 'cierre' ELSE 'linea_base' END)
    OR cohorte_id IS DISTINCT FROM '1724cd6d-c72d-49b2-94e0-6d96948c3a1e'::uuid
  )
ON CONFLICT (id) DO NOTHING;
-- attendu : INSERT 0 118

UPDATE encuestas_ambiente_escolar e
SET fase = CASE WHEN e.created_at >= '2026-01-01' THEN 'cierre' ELSE 'linea_base' END,
    cohorte_id = '1724cd6d-c72d-49b2-94e0-6d96948c3a1e'::uuid
FROM _undo_ae_fase_20260812 u
WHERE e.id = u.id;
-- attendu : UPDATE 118

-- Contrôle avant validation
SELECT institucion_educativa,
       date_part('year', created_at) AS anio,
       fase, cohorte_id, count(*)
FROM encuestas_ambiente_escolar
WHERE institucion_educativa ILIKE '%Normal Superior de Mar%'
   OR institucion_educativa ILIKE '%Concejo Municipal El Porvenir%'
GROUP BY 1,2,3,4
ORDER BY 1,2,3;

COMMIT;  -- ou ROLLBACK; si les comptes ne correspondent pas
```

Attendu après COMMIT : 4 lignes seulement, toutes sur la cohorte Rionegro 2025 — 2025/`linea_base` 102 et 90, 2026/`cierre` 98 et 61.

## Étape 2 — Undo (tant que la table de sauvegarde existe)

```sql
BEGIN;

UPDATE encuestas_ambiente_escolar e
SET fase = u.old_fase,
    cohorte_id = u.old_cohorte_id
FROM _undo_ae_fase_20260812 u
WHERE e.id = u.id;

SELECT institucion_educativa, date_part('year', created_at) AS anio, fase, cohorte_id, count(*)
FROM encuestas_ambiente_escolar
WHERE institucion_educativa ILIKE '%Normal Superior de Mar%'
   OR institucion_educativa ILIKE '%Concejo Municipal El Porvenir%'
GROUP BY 1,2,3,4 ORDER BY 1,2,3;

COMMIT;
```

Nettoyage uniquement une fois le résultat validé et définitif :

```sql
DROP TABLE _undo_ae_fase_20260812;
```

Pour une école supplémentaire : ajouter un `OR institucion_educativa ILIKE '%…%'` dans chaque clause `WHERE`. La sauvegarde s'accumule dans la même table et `ON CONFLICT DO NOTHING` protège les valeurs d'origine déjà enregistrées.

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
