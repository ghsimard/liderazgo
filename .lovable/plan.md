# Requalification SQL des 55 réponses — avec undo

Oui, un undo est possible : on crée une **table de sauvegarde** avant l'UPDATE, qui conserve l'ancienne `fase` et l'ancien `cohorte_id` de chaque ligne modifiée. Tant que cette table existe, la restauration est exacte.

## Étape 0 — Contrôle du périmètre (aucune modification)

```sql
SELECT id, tipo_formulario, fase, cohorte_id, created_at AT TIME ZONE 'America/Bogota' AS fecha
FROM encuestas_ambiente_escolar
WHERE institucion_educativa ILIKE '%Normal Superior de Mar%'
  AND created_at >= '2026-01-01'
  AND fase = 'linea_base'
ORDER BY created_at;
```

Vérifier que le compte est bien 55 avant de continuer.

## Étape 1 — Sauvegarde + requalification (transaction unique)

Remplacer `<COHORTE_CIERRE_ID>` par l'id de la cohorte cible (Rionegro 2025 : celui déjà utilisé par les 6 réponses `cierre`).

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
WHERE institucion_educativa ILIKE '%Normal Superior de Mar%'
  AND created_at >= '2026-01-01'
  AND fase = 'linea_base'
ON CONFLICT (id) DO NOTHING;

UPDATE encuestas_ambiente_escolar e
SET fase = 'cierre',
    cohorte_id = '<COHORTE_CIERRE_ID>'::uuid
FROM _undo_ae_fase_20260812 u
WHERE e.id = u.id;

-- Contrôle avant validation
SELECT fase, cohorte_id, count(*)
FROM encuestas_ambiente_escolar
WHERE institucion_educativa ILIKE '%Normal Superior de Mar%'
  AND created_at >= '2026-01-01'
GROUP BY 1,2;

COMMIT;  -- ou ROLLBACK; si le contrôle est incorrect
```

Attendu après COMMIT : 61 lignes en `cierre` sur la cohorte Rionegro 2025.

## Étape 2 — Undo (à tout moment tant que la table de sauvegarde existe)

```sql
BEGIN;

UPDATE encuestas_ambiente_escolar e
SET fase = u.old_fase,
    cohorte_id = u.old_cohorte_id
FROM _undo_ae_fase_20260812 u
WHERE e.id = u.id;

SELECT fase, count(*)
FROM encuestas_ambiente_escolar
WHERE institucion_educativa ILIKE '%Normal Superior de Mar%'
  AND created_at >= '2026-01-01'
GROUP BY 1;

COMMIT;
```

Nettoyage seulement une fois le résultat validé et définitif :

```sql
DROP TABLE _undo_ae_fase_20260812;
```

## Point d'amont à vérifier après coup

La phase enregistrée provient de la **campagne active** (`ae_campanas`) au moment de la soumission, pas d'un choix de l'utilisateur. Sans correction de la campagne, les prochaines réponses de cette école repartiront en `linea_base` / Oriente 2026.

```sql
SELECT c.id, c.nombre, c.fase, c.fecha_inicio, c.fecha_fin, co.nombre AS cohorte
FROM ae_campanas c JOIN ae_cohortes co ON co.id = c.cohorte_id
ORDER BY c.fecha_inicio DESC;
```

## Actions Render

- 🖥️ Site statique (Frontend) : rien
- ⚙️ Web Service (Backend Express) : rien
- 🗄️ Base de données (SQL manuel) : Étape 1 (et Étape 2 en cas d'undo)
