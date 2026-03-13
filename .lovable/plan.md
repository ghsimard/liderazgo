

## Acudientes : remplacer le pie chart par une barre horizontale segmentée

**Fichier** : `src/utils/ambienteEscolarReportPdfGenerator.ts`, lignes ~718-761

**Changements** :

1. **Compter par grado individuel** : itérer sur `GRADOS_COMPLETOS` (Primera infancia, Preescolar, 1°…11°, 12°) et compter les occurrences dans `sub.respuestas.grados[]`.

2. **Dessiner une barre horizontale segmentée** (remplace le pie chart) :
   - Barre unique de largeur `contentW`, hauteur ~8mm
   - Chaque segment proportionnel au % du grado, avec une couleur distincte (palette de ~15 couleurs)
   - Pourcentage affiché au-dessus de chaque segment (si largeur suffisante, ≥ 3%)

3. **Légende** en dessous : pastilles colorées + label ("Preescolar - 12%", "1° - 8%", etc.), répartie sur 2-3 lignes

4. **Supprimer** le bloc `else` (cas vide, lignes 758-760) — pas besoin de gérer le cas sans données.

