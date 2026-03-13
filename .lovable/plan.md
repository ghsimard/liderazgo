

## Analyse : Comment les dimensions de logos sont calculées dans les PDF

L'investigation révèle **3 approches différentes** utilisées à travers les 12 générateurs, ce qui explique les incohérences :

### Approches actuelles

```text
Approche                      Fichiers                           Résultat
─────────────────────────────────────────────────────────────────────────────
A) pxToMm = 25.4/96 * 0.50   reporte360, ambienteReport         Dépend de la résolution
   → w = naturalPx * pxToMm                                      du fichier image source
                                                                  (ex: image 400px → 53mm,
                                                                   image 800px → 106mm !)

B) Hauteur fixe + ratio       melGlobal, reporte360Mel,          ✅ Correct et stable
   → logoTargetH = 24mm       melRubrica, satisfaccion           Toujours la même taille
   → w = (natW/natH) * 24                                        quel que soit le fichier

C) Dimensions hardcodées      pdfGenerator, blankFicha,          ⚠ Déforme le logo
   → logoW = 22, logoH = 18   blankEncuesta, blankRubrica,       si le ratio réel ≠
   → logoW = 18, logoH = 14   blankAmbiente                      22/18 ou 18/14
```

### Problème principal

**L'approche A** (utilisée par `reporte360PdfGenerator` et `ambienteEscolarReportPdfGenerator`) fait dépendre la taille du logo de la résolution pixel de l'image source. Si quelqu'un uploade un logo 2× plus grand en pixels, il sera 2× plus grand dans le PDF.

**L'approche C** ignore le ratio d'aspect naturel du logo — les logos apparaissent étirés ou écrasés.

### Solution recommandée

**Standardiser sur l'approche B** dans `pdfLogoHelper.ts` :

```typescript
// Constantes centralisées
const COVER_LOGO_H = 24;   // mm — logos sur page de couverture
const HEADER_LOGO_H = 10;  // mm — logos en en-tête pages intérieures
const FOOTER_COSMO_H = 7;  // mm — logo Cosmo en footer

// Calcul proportionnel (préserve le ratio d'aspect)
function logoDims(naturalW: number, naturalH: number, targetH: number) {
  return { w: (naturalW / naturalH) * targetH, h: targetH };
}
```

Cette approche :
- Fixe une **hauteur cible en mm** (indépendante de la résolution du fichier source)
- Calcule la **largeur proportionnellement** au ratio naturel (pas de déformation)
- Produit un résultat **identique** quelle que soit la taille en pixels de l'image uploadée

Cela sera intégré dans le `pdfLogoHelper.ts` du plan déjà approuvé, avec les constantes `COVER_LOGO_H = 24`, `HEADER_LOGO_H = 10`, `FOOTER_COSMO_H = 7` appliquées uniformément aux 12 générateurs.

