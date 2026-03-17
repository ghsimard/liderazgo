

## Ajouter un bouton "Ir a Mi Panel" sur l'écran de succès de la Ficha

### Contexte
Après soumission de la ficha, l'écran de succès affiche uniquement "Descargar PDF" et "Rellenar otra ficha". L'utilisateur n'a aucun moyen d'accéder à son panel (Mi Panel) depuis cet écran.

### Modification

**Fichier** : `src/pages/FichaRLT.tsx` (lignes 901-917)

Ajouter un troisième bouton "Ir a Mi Panel" dans la rangée de boutons existante, après "Rellenar otra ficha" :

```tsx
<button
  onClick={() => navigate("/mi-panel")}
  className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium border border-border transition-colors hover:bg-muted"
>
  <ArrowRight className="w-4 h-4" />
  Ir a Mi Panel
</button>
```

L'icône `ArrowRight` est déjà importée dans le projet (utilisée dans `Index.tsx`). Il faudra l'ajouter à l'import lucide-react de `FichaRLT.tsx`.

### Résultat
L'écran de succès affichera 3 options : Descargar PDF, Rellenar otra ficha, Ir a Mi Panel.

