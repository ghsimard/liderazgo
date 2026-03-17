

## Plan : Supprimer AdminUsersTab legacy

Le composant est importé dans `AdminPage.tsx` mais **jamais rendu** (`<AdminUsersTab` n'apparaît nulle part). C'est du code mort.

### Changements

1. **Supprimer** `src/components/admin/AdminUsersTab.tsx`
2. **`src/pages/AdminPage.tsx`** : retirer la ligne `import AdminUsersTab`
3. **`server/MIGRATION_GUIDE.md`** : mettre à jour les 2 références pour indiquer "Supprimé (legacy migré vers AdminGestionCuentasTab)"

Aucun impact fonctionnel — le composant n'est pas utilisé.

