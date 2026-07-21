## Objectif
Rétablir dans `src/pages/MiPanel.tsx` la logique originale (`.limit(1)`) pour la vérification de `rubrica_visible`, **tout en conservant** l'ajout Q/R du FAQ (`src/pages/FaqPage.tsx`).

## Modification

Fichier : `src/pages/MiPanel.tsx`, lignes 208-213

**Actuel** :
```ts
const { data: asigData } = await supabase
  .from("rubrica_asignaciones")
  .select("rubrica_visible")
  .eq("directivo_cedula", cedula);
const hasAsig = (asigData || []).some((r: any) => r.rubrica_visible === true);
setRubricaEnabled(hasAsig);
```

**Restauration** :
```ts
const { data: asigData } = await supabase
  .from("rubrica_asignaciones")
  .select("rubrica_visible")
  .eq("directivo_cedula", cedula)
  .limit(1)
  .maybeSingle();
setRubricaEnabled(!!asigData?.rubrica_visible);
```

## Actions par catégorie
- 🖥️ **Site statique (Frontend)** : édition unique de `src/pages/MiPanel.tsx`.
- ⚙️ **Web Service (Backend Express)** : aucune.
- 🗄️ **Base de données (SQL manuel)** : aucune.

## Note
Le FAQ ajouté précédemment dans `src/pages/FaqPage.tsx` (Q/R sur l'activation de l'Encuesta 360°) reste intact.
