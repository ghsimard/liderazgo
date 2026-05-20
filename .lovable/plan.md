# Ajout du descripteur de niveau dans le PDF des Rúbricas

## Problème

Dans le PDF d'un module de rúbrica (`Informe_Rubrica_Mx_xxx.pdf`), chaque ítem affiche actuellement, pour chaque colonne (Autoevaluación, Evaluación Equipo, Nivel Acordado, Seguimiento) :

- le **nom du niveau** (ex. « Avanzado »)
- le **commentaire** du rector / équipe

Mais il manque la **définition du niveau** : c'est-à-dire le texte de la rúbrica qui décrit ce que signifie « Avanzado » pour cet ítem (le `desc_avanzado` / `desc_intermedio` / `desc_basico` / `desc_sin_evidencia` correspondant).

L'utilisateur ne peut donc pas savoir, en lisant le PDF seul, à quoi correspond le niveau choisi.

## Solution

Dans `src/utils/rubricaModulePdfGenerator.ts`, ajouter sous le nom du niveau (entre le badge « Avanzado » et le commentaire) le **texte descriptif du niveau choisi**, extrait de `descAvanzado` / `descIntermedio` / `descBasico` / `descSinEvidencia` de l'ítem courant.

Si la colonne n'a pas de niveau (« — »), aucun descripteur n'est affiché.

## Détails techniques

Fichier : `src/utils/rubricaModulePdfGenerator.ts`

1. Supprimer la ligne actuelle qui imprime `Objetivo: ${item.descAvanzado}` sous le titre de l'ítem (elle est trompeuse : ce n'est pas un objectif, c'est la définition du niveau Avanzado).
2. Ajouter une petite fonction utilitaire `getDescForNivel(item, nivel)` qui renvoie la chaîne descriptive selon la clé (`avanzado` → `descAvanzado`, etc.).
3. Dans la boucle des 4 colonnes, après l'impression du badge `nivelText` et avant le commentaire, imprimer en italique gris (fontSize 7) le descripteur correspondant, wrappé à `colW - 4`.
4. Recalculer `colY` et `maxH` pour inclure la hauteur de ce nouveau bloc (et donc allonger la cellule si nécessaire).
5. Pour la colonne « Seguimiento », ne pas afficher de descripteur (la rúbrica de seguimiento utilise les mêmes niveaux ; on garde la cohérence visuelle en affichant le descripteur du niveau choisi).

Aucun changement requis pour : base de données, Express Render, `blankRubricaPdfGenerator.ts` (déjà OK car il liste tous les niveaux), ou autres composants.

## Actions par environnement

- 🖥️ **Site statique (Frontend)** : modifier `src/utils/rubricaModulePdfGenerator.ts` uniquement. Merge GitHub → déploiement automatique.
- ⚙️ **Web Service (Backend Express)** : aucune action.
- 🗄️ **Base de données** : aucune action.
