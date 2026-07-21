## Objectif
Retirer la limite `.limit(1).maybeSingle()` sur la vérification de `rubrica_visible` dans `src/pages/MiPanel.tsx`, pour afficher le bouton Rúbricas dès qu'**au moins une** assignation est visible.

## Modification

Fichier : `src/pages/MiPanel.tsx` (lignes ~208-213)

**Actuel** :
```ts
const { data: asigData } = await supabase
  .from("rubrica_asignaciones")
  .select("rubrica_visible")
  .eq("directivo_cedula", cedula)
  .limit(1)
  .maybeSingle();
setRubricaEnabled(!!asigData?.rubrica_visible);
```

**Remplacement** :
```ts
const { data: asigData } = await supabase
  .from("rubrica_asignaciones")
  .select("rubrica_visible")
  .eq("directivo_cedula", cedula);
const hasAsig = (asigData || []).some((r: any) => r.rubrica_visible === true);
setRubricaEnabled(hasAsig);
```

## Justification
Un directivo peut avoir plusieurs coachs assignés. Avec `.limit(1)` sans `order`, la ligne renvoyée est arbitraire : si elle tombe sur une assignation non visible, le bouton disparaît alors qu'une autre assignation visible existe.

## Actions par catégorie
- 🖥️ **Site statique (Frontend)** : édition unique de `src/pages/MiPanel.tsx`.
- ⚙️ **Web Service (Backend Express)** : aucune.
- 🗄️ **Base de données (SQL manuel)** : aucune.
