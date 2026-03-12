

## Plan : Déplacer la Papelera dans la section Sistema

### Modifications

**1. `src/components/admin/AdminSidebar.tsx`**
- Ajouter un item `{ tab: "papelera", label: "Papelera", icon: Trash2 }` dans la section "Sistema", avant "Purgar datos"

**2. `src/pages/AdminPage.tsx`**
- Ajouter un `TabsContent` (ou rendu conditionnel) pour `value="papelera"` au niveau global, rendant `<AdminTrashManager />`
- Retirer le sous-onglet "Papelera" des tabs internes de la configuration 360° (lignes 330 et 336)

Aucun changement aux composants enfants. La Papelera reste identique, elle est juste accessible depuis la sidebar globale au lieu d'être imbriquée dans le hub 360°.

