

## Plan : Ajouter le titre visible « Mi Panel » au-dessus des logos

### Modification dans `src/pages/MiPanel.tsx`

Ajouter un titre `<h1>` ou `<CardTitle>` au tout début du `CardHeader`, **avant** le bloc `<div>` qui contient les logos, dans les deux écrans :

1. **Écran de sélection de rôle** (dual role, lignes ~186-193) : insérer `<CardTitle className="text-xl font-bold">Mi Panel</CardTitle>` avant le `<div className="flex justify-center items-center gap-4">` des logos.

2. **Écran dashboard principal** (lignes ~220-227) : même chose, insérer le titre « Mi Panel » avant le bloc logos.

Le titre existant « Hola, {nombre} » reste en dessous des logos comme sous-titre.

### Fichier modifié
- `src/pages/MiPanel.tsx`

