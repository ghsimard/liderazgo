

# Capture d'écran statique pour Mi Panel (Directivo)

## Résumé

Remplacer l'iframe live du hub #3 (Mi Panel Directivo) par une image statique capturée depuis l'application réelle. L'iframe ne fonctionne pas pour cette page car elle nécessite une session authentifiée.

## Étapes

### 1. Capturer la screenshot

Utiliser l'outil browser pour naviguer vers le Mi Panel d'un rector sur l'app preview, prendre une capture d'écran, et la sauvegarder dans `public/images/`.

### 2. Modifier `src/pages/specs/SpecsHubs.tsx`

Dans le bloc "Live preview" (lignes 653-671), ajouter une condition : si `hub.id === "mi-panel-directivo"`, afficher une `<img>` statique au lieu de l'iframe.

```tsx
{hub.id === "mi-panel-directivo" ? (
  <img
    src="/images/mi-panel-directivo-preview.png"
    alt="Mi Panel — Vista Rector"
    className="w-full rounded-lg border border-border"
  />
) : (
  // existing iframe block
)}
```

### Fichiers modifiés
- `public/images/mi-panel-directivo-preview.png` — nouvelle image
- `src/pages/specs/SpecsHubs.tsx` — condition pour afficher l'image au lieu de l'iframe

## Note importante

Il faudra d'abord que je prenne la capture d'écran. Pour cela, j'aurai besoin que tu te connectes au Mi Panel d'un rector dans l'app et que tu m'envoies une capture d'écran via le chat, **ou** que tu me donnes une cédula de test valide pour que je puisse naviguer et capturer moi-même.

