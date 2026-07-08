## Diagnostic

Sur prod Render, la contrainte `encuestas_ambiente_escolar_campana_id_fkey` refuse `b0baca1f-…` car cette `campana_id` n'existe pas dans `ae_campanas` sur prod (elle vient de Cloud). La colonne est **nullable**, donc on peut soit :

- **Option A (recommandée)** : chercher la vraie `campana_id` prod correspondant à la cohorte Medellín 2025 et l'utiliser.
- **Option B (fallback simple)** : insérer avec `campana_id = NULL`. Le Monitor filtre par `cohorte_id`, pas par `campana_id`, donc les compteurs s'afficheront correctement.

## SQL à exécuter sur Render — 🗄️ Base de données uniquement

### Étape 0 — Trouver la campana_id prod (à exécuter d'abord)

```sql
SELECT id, nombre, cohorte_id
FROM public.ae_campanas
WHERE cohorte_id = 'c25708c1-54f7-4044-96bc-7d15bf449d4f';
```

- Si **une ligne** est retournée → copier son `id` et remplacer `<CAMPANA_PROD>` ci-dessous.
- Si **aucune ligne** → laisser `NULL` (remplacer `'<CAMPANA_PROD>'::uuid` par `NULL::uuid` dans les 3 blocs).

### Étape 1 — Insertion corrigée (idempotente)

Identique au SQL précédent, à un seul détail près : la valeur `campana_id` dans le `WITH cfg AS (...)` de chaque bloc devient :

```sql
'<CAMPANA_PROD>'::uuid AS campana_id
```

ou

```sql
NULL::uuid AS campana_id
```

Tout le reste (docentes / estudiantes / acudientes, `NOT EXISTS`, patterns ILIKE) reste **inchangé**.

### Étape 2 — Vérification

```sql
SELECT tipo_formulario, institucion_educativa, count(*)
FROM public.encuestas_ambiente_escolar
WHERE cohorte_id='c25708c1-54f7-4044-96bc-7d15bf449d4f'
  AND institucion_educativa ILIKE ANY (
    ARRAY['%bello horizonte%','%diamante%','%don bosco%','%manuel uribe%'])
GROUP BY 1,2 ORDER BY 2,1;
```

Attendu : 23/128/81 (Bello Horizonte), 13/33/48 (El Diamante), 0/0/1 (Ciudad Don Bosco), 29/40/35 (Manuel Uribe Ángel).

## Actions requises

- 🗄️ **Base de données Render** : exécuter étapes 0 → 1 → 2 ci-dessus.
- ⚙️ **Web Service Express** : rien.
- 🖥️ **Site statique** : rien (Ctrl+Shift+R sur le Monitor).

## Question

Voulez-vous que je rédige le SQL complet **avec `campana_id = NULL`** tout de suite (safe, fonctionne dans tous les cas), ou préférez-vous d'abord me communiquer le résultat de l'étape 0 pour utiliser la vraie `campana_id` prod ?
