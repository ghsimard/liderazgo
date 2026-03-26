

## Plan: Corriger la visibilité du bouton "Informe de Módulo" pour les évaluateurs

### Problème

Le bouton "Informe de Módulo" dans Mi Panel est conditionné par `evalHasInformes`, qui vérifie si des enregistrements existent déjà dans `informe_modulo`. Un évaluateur ne peut donc jamais accéder au formulaire pour créer le premier informe — c'est un cercle vicieux.

### Solution

Remplacer la condition de visibilité : au lieu de vérifier l'existence d'informes, vérifier que l'évaluateur **a des directivos assignés** (même condition que pour les rúbricas, `evalHasAssignments`). C'est la condition logique correcte — un évaluateur avec des assignations doit pouvoir créer des informes de módulo.

### Modification

**Fichier** : `src/pages/MiPanel.tsx`

- Ligne ~538 : changer `{evalHasInformes && (` → `{evalHasAssignments && (`
- Optionnel : supprimer la variable `evalHasInformes` et la requête associée (lignes ~326-329) puisqu'elle ne sera plus utilisée.

### Impact

Un seul fichier modifié, changement minimal.

