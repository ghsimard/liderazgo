

## Plan: Ajuster l'espacement pour garder "Otros títulos" sur la page 1 + uniformiser les logos page 2

### Problème
1. Le champ "Otros títulos, ¿cuáles?" déborde sur la page 2 par manque d'espace vertical.
2. `drawPageHeader` (page 2) utilise des dimensions fixes (`logoH=18, logoW=22`) au lieu de `logoDims()` + `HEADER_LOGO_H`, ce qui donne des logos de taille différente de la page 1.

### Modifications dans `src/utils/blankFichaPdfGenerator.ts`

**1. Réduire les espacements verticaux :**
- `drawBlankRow`: `y += 7` → `y += 6`
- `drawBlankRowDouble`: `y += 7` → `y += 6`
- `drawBlankArea`: inter-ligne `y += 5` → `y += 4`, marge finale `y += 2` → `y += 1`
- `drawSection`: `y += 11` → `y += 10`

**2. Uniformiser `drawPageHeader` avec `drawHeader` :**
- Remplacer les dimensions fixes (`logoH=18, logoW=22`) par `logoDims(natSize, HEADER_LOGO_H)` — identique à `drawHeader`.

