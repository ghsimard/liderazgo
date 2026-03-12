

## Plan : Logos lisibles sur fond clair + tailles augmentées

### Problème
- Les logos RLT et CLT en en-tête utilisent les versions `_white` (fond blanc sur transparent → invisibles sur fond clair)
- Le logo Cosmo en bas de page titre est petit (10mm)
- Les logos en en-tête sont à 14mm de haut

### Solution

**Fichier** : `src/utils/satisfaccionPdfGenerator.ts`

1. **Changer les imports** (lignes 9-11) :
   - `logo_rlt_white.png` → `logo_rlt.png` (version sombre, lisible sur fond clair)
   - `logo_clt_white.png` → `logo_clt_dark.png` (version sombre, lisible sur fond clair)
   - `logo_cosmo_dark.png` reste inchangé (déjà la version sombre)

2. **Augmenter la taille des logos en en-tête** (lignes 114, 119) :
   - Passer la hauteur cible de `14` → `18` mm

3. **Ajuster la ligne séparatrice** (ligne 125) :
   - Déplacer de `y=24` → `y=28` pour accommoder les logos plus grands

4. **Ajuster le retour de `drawHeader`** (ligne 126) :
   - `return 34` → `return 38` pour maintenir l'espacement

5. **Augmenter le logo Cosmo sur la page titre** (ligne 288) :
   - Hauteur de `10` → `14` mm

