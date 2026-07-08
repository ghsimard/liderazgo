## Diagnostic

Sur le Monitor, la ligne s'affiche en **minuscule** `institución Educativa Manuel Uribe Ángel` avec 0/0/0. Or les vraies encuestas sont stockées en **majuscule** `Institución Educativa Manuel Uribe Ángel` (29/40/33 historiques + 2 acudientes ajoutés par la dernière migration). Le Monitor construit sa liste depuis `ae_cohorte_instituciones` et joint sur `institucion_educativa` égal — le match échoue à cause de la casse du premier caractère.

Correction : normaliser `ae_cohorte_instituciones` vers la variante majuscule (celle utilisée par les données historiques + les tables source `ae_*_submissions_2025`).

## Correction — 🗄️ Base de données Render uniquement

### Étape 1 — Vérifier le libellé actuel

```sql
SELECT institucion_educativa, length(institucion_educativa)
FROM public.ae_cohorte_instituciones
WHERE cohorte_id = 'c25708c1-54f7-4044-96bc-7d15bf449d4f'
  AND institucion_educativa ILIKE '%manuel uribe%';
```

Attendu : 1 ligne avec `i` minuscule.

### Étape 2 — Normaliser vers la majuscule

```sql
UPDATE public.ae_cohorte_instituciones
SET institucion_educativa = 'Institución Educativa Manuel Uribe Ángel'
WHERE cohorte_id = 'c25708c1-54f7-4044-96bc-7d15bf449d4f'
  AND institucion_educativa ILIKE '%manuel uribe%'
  AND substring(institucion_educativa FROM 1 FOR 1) = 'i';
```

Attendu : **1 ligne** modifiée.

### Étape 3 — Vérification côté Monitor

Ctrl+Shift+R sur le Monitor. La ligne `Institución Educativa Manuel Uribe Ángel` doit afficher **29 / 40 / 35** au lieu de 0/0/0.

## Fallback si le compteur reste à 0

Il existe peut-être une seconde source (table `instituciones` globale) à normaliser aussi :

```sql
UPDATE public.instituciones
SET nombre = 'Institución Educativa Manuel Uribe Ángel'
WHERE nombre ILIKE '%manuel uribe%'
  AND substring(nombre FROM 1 FOR 1) = 'i';
```

À exécuter uniquement si l'étape 3 ne suffit pas.

## Actions requises

- 🗄️ **Base de données Render** : Étape 1 → 2 → 3 (Étape fallback seulement si nécessaire).
- ⚙️ **Web Service Express** : rien.
- 🖥️ **Site statique** : Ctrl+Shift+R sur le Monitor.
