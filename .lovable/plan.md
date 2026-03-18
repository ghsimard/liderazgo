

## Plan: Supprimer les icônes de visibilité du moniteur

Retirer les deux icônes "œil" (Eye/EyeOff) du composant `AdminEncuestaMonitor.tsx` :

1. **Colonne "Par"** : Supprimer l'icône Eye/EyeOff et le Tooltip associé à côté du nom du directivo. Afficher uniquement le nom.

2. **Colonne "Institución"** : Supprimer l'icône Eye/EyeOff conditionnelle et le Tooltip associé à côté du nom de l'institution. Afficher uniquement le texte.

3. **Supprimer l'opacité conditionnelle** sur la ligne (`opacity-60` quand non visible) — toutes les lignes auront la même apparence.

4. **Nettoyage** : Retirer les fonctions `resolveVisibility`, `getVisibilitySource`, l'état `visibility`, la query sur `encuesta_360_visibility`, et les imports `Eye`, `EyeOff`, `Tooltip*` s'ils ne sont plus utilisés.

**Fichier modifié** : `src/components/admin/AdminEncuestaMonitor.tsx`

