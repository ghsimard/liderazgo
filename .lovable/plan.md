# Remplacer les zones noircies par « N/A » dans le rapport PDF

## Situation actuelle

Dans le PDF du rapport Ambiente Escolar, lorsqu'une donnée n'existe pas, la cellule est remplie en noir (RGB 30,30,30) sans aucun texte. Cela se produit à trois endroits :

1. Barres de synthèse S/A/N par composante — quand un acteur n'a aucune réponse (barre entièrement noire).
2. Tableau « Fortalezas y Retos » — quand un item existe pour l'acteur mais sans réponses (cellule noire).
3. Tableau « Fortalezas y Retos » — quand l'item n'existe pas dans le questionnaire de cet acteur (3 cellules noires).

## Changement demandé

Remplacer partout le remplissage noir par une cellule neutre affichant « N/A » :

- Fond gris très clair (au lieu du noir), fine bordure grise.
- Texte « N/A » centré, gris moyen, même taille de police que les valeurs voisines.
- Pour la barre de synthèse : une seule bande claire sur toute la largeur avec « N/A » centré.

Aucun autre changement de mise en page, de calcul ni de contenu.

## Détails techniques

- Fichier unique : `src/utils/ambienteEscolarReportPdfGenerator.ts` (lignes ~888-891, ~1113-1117, ~1119-1126).
- Palette : fond `245,245,245`, bordure `200,200,200`, texte `120,120,120`.
- La vue en ligne n'a pas de zones noircies — rien à modifier côté écran.

## Actions requises après approbation

- 🖥️ **Site statique (Frontend)** : republier l'application.
- ⚙️ **Web Service (Backend Express)** : rien à faire.
- 🗄️ **Base de données** : rien à faire.
