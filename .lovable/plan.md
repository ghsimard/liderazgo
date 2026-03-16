

## Plan : Ajouter le titre de la page « Mi Panel »

### Modification

Dans `src/pages/MiPanel.tsx`, ajouter un `useEffect` dans le composant `MiPanel` pour définir le titre du navigateur :

```tsx
useEffect(() => {
  document.title = "Mi Panel";
}, []);
```

Cela mettra à jour l'onglet du navigateur pour afficher « Mi Panel » lorsque l'utilisateur est sur cette page.

### Fichier modifié
- `src/pages/MiPanel.tsx`

