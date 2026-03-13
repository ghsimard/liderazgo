

## Problème

La modale `ResponseDetailDialog` dans `AdminSatisfaccionesTab.tsx` utilise `DialogContent` avec `flex flex-col max-h-[85vh]`, et un `ScrollArea` avec `flex-1` pour le corps. Cependant, le `DialogContent` global (dans `dialog.tsx`) applique `overflow-y-auto max-h-[90vh]`, ce qui entre en conflit : le contenu entier s'étend au lieu de laisser le `ScrollArea` gérer le défilement.

## Solution

Ajouter `overflow-hidden` sur le `DialogContent` de cette modale spécifique (ligne 622) pour neutraliser le `overflow-y-auto` global. Cela forcera le `ScrollArea` interne à devenir la seule zone scrollable, avec l'en-tête qui reste fixe en haut.

### Modification

**`src/components/admin/AdminSatisfaccionesTab.tsx` — ligne 622**

Changer :
```tsx
<DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
```
En :
```tsx
<DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
```

Ajout aussi de `min-h-0` sur le `ScrollArea` (ligne 652) pour garantir que flex-1 fonctionne correctement dans un conteneur flex :
```tsx
<ScrollArea className="flex-1 min-h-0 px-6 py-4">
```

