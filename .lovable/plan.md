

## Plan: Propager `allowedRegions` dans AdminInformeModuloTab

### Problème

Dans `OperadorPanel.tsx` ligne 116, `AdminInformeModuloTab` est rendu **sans** la prop `allowedRegions`. À l'intérieur, ce composant instancie `AdminAsistenciaTab`, `AdminInformeModuloForm`, `AdminEvalIndividualTab` et `AdminInformeReportTab` sans aucun filtrage régional. L'opérateur avec permission "Quibdó" voit donc toutes les régions (dont Oriente).

### Solution

**Fichier 1 : `src/pages/OperadorPanel.tsx`**
- Ligne 116 : passer `allowedRegions` à `AdminInformeModuloTab`

**Fichier 2 : `src/components/admin/AdminInformeModuloTab.tsx`**
- Ajouter `allowedRegions?: string[]` aux props
- Propager cette prop à chaque sous-composant : `AdminAsistenciaTab`, `AdminInformeModuloForm`, `AdminEvalIndividualTab`, `AdminInformeReportTab`

**Fichiers 3-4 : `AdminInformeModuloForm.tsx` et `AdminEvalIndividualTab.tsx`**
- Vérifier si ces composants ont un filtre régional et y ajouter le même pattern `allowedRegions` (filtrage du dropdown régions et des données).

**Fichier 5 : `AdminInformeReportTab.tsx`**
- Même vérification et propagation si applicable.

### Impact
- Aucune migration
- Le composant reste fonctionnel sans la prop (usage admin inchangé)

