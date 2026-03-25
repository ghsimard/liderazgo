

# Ajouter des screenshots pour les sous-écrans du Mi Panel Evaluador

## Résumé

Capturer des screenshots statiques de deux écrans accessibles depuis le Mi Panel Evaluador (cédula 99999999) et les afficher sous la preview existante dans le hub #4.

## Écrans à capturer

1. **Mi Rúbrica de Evaluación** — l'écran de rúbrica accessible depuis le panel évaluateur
2. **Encuestas 360° - Entrada** — l'écran d'encuestas 360 accessible depuis le panel évaluateur

## Étapes

### 1. Capturer les deux screenshots

Naviguer avec la cédula `99999999` vers chaque sous-écran et capturer les images :
- `public/images/evaluador-rubrica-preview.png`
- `public/images/evaluador-encuestas360-preview.png`

### 2. Modifier `src/pages/specs/SpecsHubs.tsx`

Dans le bloc du hub `mi-panel-evaluador` (lignes 665-673), ajouter les deux images supplémentaires sous l'image existante du panel, avec des sous-titres :

```tsx
) : hub.id === "mi-panel-evaluador" ? (
  <div className="space-y-4">
    <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
      <p className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50">Mi Panel — Vista general</p>
      <img src="/images/mi-panel-evaluador-preview.png" alt="Mi Panel — Vista Evaluador" className="w-full" loading="lazy" />
    </div>
    <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
      <p className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50">Mi Rúbrica de Evaluación</p>
      <img src="/images/evaluador-rubrica-preview.png" alt="Rúbrica de Evaluación — Vista Evaluador" className="w-full" loading="lazy" />
    </div>
    <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
      <p className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50">Encuestas 360° — Entrada</p>
      <img src="/images/evaluador-encuestas360-preview.png" alt="Encuestas 360° — Vista Evaluador" className="w-full" loading="lazy" />
    </div>
  </div>
```

### Fichiers

| Fichier | Action |
|---------|--------|
| `public/images/evaluador-rubrica-preview.png` | Nouveau — screenshot |
| `public/images/evaluador-encuestas360-preview.png` | Nouveau — screenshot |
| `src/pages/specs/SpecsHubs.tsx` | Modifié — galerie d'images pour hub #4 |

