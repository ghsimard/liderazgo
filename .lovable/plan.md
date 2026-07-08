## Diagnostic

Le SELECT diagnostic révèle deux variantes pour Manuel Uribe Ángel :

- **Historique légitime** (`I` majuscule, `campana_id = 8ab45db7-…`) : 29 docentes / 40 estudiantes / 33 acudientes
- **Nouvellement inséré** (`i` minuscule, `campana_id NULL`) : 29 / 40 / 35 ← duplicat créé par mon INSERT précédent

Correction : supprimer les lignes NULL puis ré-insérer uniquement les 2 acudientes manquants avec le libellé + `campana_id` historiques (récupérés dynamiquement).

## Correction — 🗄️ Base de données Render uniquement

### Étape 1 — Suppression des lignes campana_id NULL

```sql
DELETE FROM public.encuestas_ambiente_escolar
WHERE cohorte_id = 'c25708c1-54f7-4044-96bc-7d15bf449d4f'
  AND campana_id IS NULL
  AND institucion_educativa ILIKE '%manuel uribe%';
```

Attendu : **104 lignes** supprimées.

### Étape 2 — Ré-insertion des 2 acudientes manquants (libellé + campana_id historiques via CTE)

```sql
WITH ref AS (
  SELECT institucion_educativa AS ie_target,
         campana_id            AS camp_target,
         cohorte_id,
         entidad_territorial,
         fase
  FROM public.encuestas_ambiente_escolar
  WHERE cohorte_id = 'c25708c1-54f7-4044-96bc-7d15bf449d4f'
    AND institucion_educativa ILIKE '%manuel uribe%'
    AND campana_id IS NOT NULL
  LIMIT 1
)
INSERT INTO public.encuestas_ambiente_escolar
  (created_at, tipo_formulario, institucion_educativa, respuestas,
   cohorte_id, entidad_territorial, fase, campana_id)
SELECT s.created_at, 'acudientes', ref.ie_target,
  jsonb_build_object(
    'grados_estudiantes',   s.grados_estudiantes,
    'comunicacion',         s.comunicacion,
    'practicas_pedagogicas',s.practicas_pedagogicas,
    'convivencia',          s.convivencia
  ),
  ref.cohorte_id, ref.entidad_territorial, ref.fase, ref.camp_target
FROM public.ae_acudientes_submissions_2025 s, ref
WHERE s.institucion_educativa ILIKE '%manuel uribe%'
  AND NOT EXISTS (
    SELECT 1 FROM public.encuestas_ambiente_escolar e
    WHERE e.tipo_formulario = 'acudientes'
      AND e.cohorte_id = ref.cohorte_id
      AND e.institucion_educativa ILIKE '%manuel uribe%'
      AND e.created_at = s.created_at
  );
```

Attendu : **2 lignes** insérées.

### Étape 3 — Vérification finale

```sql
SELECT tipo_formulario, institucion_educativa, count(*)
FROM public.encuestas_ambiente_escolar
WHERE cohorte_id='c25708c1-54f7-4044-96bc-7d15bf449d4f'
  AND institucion_educativa ILIKE ANY (
    ARRAY['%bello horizonte%','%diamante%','%don bosco%','%manuel uribe%'])
GROUP BY 1,2 ORDER BY 2,1;
```

Attendu : 10 lignes, une seule variante Manuel Uribe (uppercase), acudientes = 35.

## Actions requises

- 🗄️ **Base de données Render** : Étape 1 → 2 → 3.
- ⚙️ **Web Service Express** : rien.
- 🖥️ **Site statique** : Ctrl+Shift+R sur le Monitor.
