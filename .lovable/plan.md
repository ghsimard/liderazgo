

## Plan: Déplacer la gestion de visibilité dans les sous-onglets Entrada et Salida

### Contexte actuel
- Le sous-onglet **Configuración > Visibilidad** contient : toggles par région + overrides par institution/directivo
- Les sous-onglets **Entrada** et **Salida** (`AdminEncuestas360Tab`) ont déjà des badges de visibilité par institution (toggle inline)
- L'utilisateur veut que **toute** la gestion de visibilité soit directement dans Entrada/Salida

### Changements

**1. `src/components/admin/AdminEncuestas360Tab.tsx`**
- Ajouter une section dépliable (Collapsible ou Accordion) en haut de chaque onglet Entrada/Salida contenant :
  - Les **toggles par région** (filtrés pour la fase correspondante : `inicial` ou `final`)
  - Le formulaire d'**ajout d'overrides** (institution ou directivo) pour cette fase uniquement
  - La **liste des overrides** existants pour cette fase avec possibilité de suppression
- Réutiliser la logique du `AdminEncuesta360VisibilityTab` mais filtrée sur la fase du tab courant

**2. `src/pages/AdminPage.tsx`**
- Supprimer le sous-onglet "Visibilidad" du menu Configuración
- Supprimer l'import de `AdminEncuesta360VisibilityTab`
- Supprimer l'entrée `visibilidad360` du mapping de tabs
- Retirer l'icône Eye du TabsTrigger de visibilidad

**3. `src/components/admin/AdminEncuesta360VisibilityTab.tsx`**
- Supprimer ce fichier (code mort)

**4. `src/data/rbacSections.ts`** (si applicable)
- Supprimer la référence à `visibilidad360` si elle existe

### Résultat
- Chaque onglet Entrada/Salida est autonome : on voit les enquêtes soumises ET on gère la visibilité au même endroit
- Plus besoin de naviguer vers Configuración pour activer/désactiver une région ou un override

### Actions RENDER
- **Frontend** : Redéployer le build
- **Backend / DB** : Aucune action requise

