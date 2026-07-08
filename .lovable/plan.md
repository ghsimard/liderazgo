## Diagnostic

Deux libellés coexistent pour la même IE sur prod :

- **Existant historiquement** : `institución Educativa Manuel Uribe Ángel` (i minuscule) — 29 docentes / 40 estudiantes / 33 acudientes
- **Dans les tables `ae_*_submissions_2025`** : `Institución Educativa Manuel Uribe Ángel` (I majuscule) — 29 / 40 / 35

L'INSERT précédent a copié le libellé source tel quel, et le `NOT EXISTS` comparait uppercase vs uppercase seulement → doublon.

## Correction — 🗄️ Base de données Render uniquement

### Étape A — Supprimer les lignes fraîchement insérées (uppercase, campana_id NULL)

```sql
DELETE FROM public.encuestas_ambiente_escolar
WHERE cohorte_id = 'c25708c1-54f7-4044-96bc-7d15bf449d4f'
  AND campana_id IS NULL
  AND institucion_educativa = 'Institución Educativa Manuel Uribe Ángel';
```

Attendu : **104 lignes supprimées** (29 + 40 + 35).

### Étape B — Ré-insérer seulement les 2 acudientes manquants avec le libellé lowercase

```sql
WITH cfg AS (
  SELECT
    'c25708c1-54f7-4044-96bc-7d15bf449d4f'::uuid AS cohorte_id,
    'institución Educativa Manuel Uribe Ángel'::text AS ie_target
)
INSERT INTO public.encuestas_ambiente_escolar
  (created_at, tipo_formulario, institucion_educativa, respuestas,
   cohorte_id, entidad_territorial, fase, campana_id)
SELECT s.created_at, 'acudientes', cfg.ie_target,
  jsonb_build_object(
    'grados_estudiantes',   s.grados_estudiantes,
    'comunicacion',         s.comunicacion,
    'practicas_pedagogicas',s.practicas_pedagogicas,
    'convivencia',          s.convivencia
  ),
  cfg.cohorte_id, 'Medellín', 'linea_base', NULL::uuid
FROM public.ae_acudientes_submissions_2025 s, cfg
WHERE s.institucion_educativa ILIKE '%manuel uribe%'
  AND NOT EXISTS (
    SELECT 1 FROM public.encuestas_ambiente_escolar e
    WHERE e.tipo_formulario = 'acudientes'
      AND e.cohorte_id = cfg.cohorte_id
      AND lower(e.institucion_educativa) = lower(cfg.ie_target)
      AND e.created_at = s.created_at
  );
```

Attendu : **2 lignes insérées**. Docentes et estudiantes sont déjà identiques (29/40) → aucun ré-insertion nécessaire pour eux.

### Étape C — Vérification

```sql
SELECT tipo_formulario, institucion_educativa, count(*)
FROM public.encuestas_ambiente_escolar
WHERE cohorte_id='c25708c1-54f7-4044-96bc-7d15bf449d4f'
  AND institucion_educativa ILIKE ANY (
    ARRAY['%bello horizonte%','%diamante%','%don bosco%','%manuel uribe%'])
GROUP BY 1,2 ORDER BY 2,1;
```

Résultat attendu : **10 lignes**, une seule variante de Manuel Uribe Ángel (lowercase), avec acudientes = 35.

## Actions requises

- 🗄️ **Base de données Render** : Étape A → B → C.
- ⚙️ **Web Service Express** : rien.
- 🖥️ **Site statique** : Ctrl+Shift+R sur le Monitor.
