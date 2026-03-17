

## Système RBAC — Rôles personnalisés avec permissions CRUD granulaires

### Statut : Phase 1 terminée ✅

### Ce qui a été implémenté

1. **Tables de base de données** :
   - `custom_roles` : rôles personnalisés (nom, description, is_system)
   - `role_permissions` : permissions CRUD par section (clé hiérarchique avec notation pointée)
   - `user_custom_roles` : assignation utilisateur ↔ rôle
   - Fonction `get_user_permissions()` (SECURITY DEFINER) pour charger les permissions sans récursion RLS

2. **Seed des rôles système** :
   - Superadmin : CRUD complet sur les 10 sections
   - Admin : CRUD complet sur les 10 sections
   - Monitoreo : lecture seule sur 8 sections (pas Sistema ni MEL)

3. **Hook `usePermissions`** (`src/hooks/usePermissions.ts`) :
   - Charge les permissions via `get_user_permissions` RPC ou API Express
   - Résolution hiérarchique : `sistema.gestion-cuentas` → fallback `sistema`
   - API : `can(section, action)`, `readableSections`, `permissions`, `loading`, `reload`

4. **Catalogue des sections** (`src/data/rbacSections.ts`) :
   - 10 sections de premier niveau + sous-sections
   - Export `RBAC_SECTIONS` et `ALL_SECTION_KEYS`

5. **Interface de gestion** (`AdminRolesTab`) :
   - Liste des rôles (cartes) avec création/édition/suppression
   - Matrice sections × CRUD avec checkboxes
   - Sous-sections dépliables (Collapsible)
   - Les rôles système ne sont modifiables que par superadmin
   - Intégré dans Sistema > "Roles y Permisos"

### Phase 2 — Migration progressive ✅

- ✅ Migrer `AdminSidebar` pour filtrer les sections visibles via `usePermissions.readableSections`
- ✅ Remplacer les checks `isViewer` / `isSuperAdmin` dans AdminPage et AdminContent par `permissions.can()`
- ✅ AdminEditFicha migré vers `usePermissions`
- ✅ Intégrer l'assignation de rôles custom dans `AdminGestionCuentasTab`
- ✅ Synchroniser `user_custom_roles` avec `user_roles` (app_role enum) pour maintenir la compatibilité RLS
- ✅ Ajouter endpoint Express `/api/user-permissions/:userId` pour le mode Render

### Notes d'architecture

Les composants enfants (`AdminFichasTab`, `AdminEncuestas360Tab`, etc.) conservent leurs props `isViewer` pour compatibilité, mais les valeurs sont désormais calculées depuis `usePermissions.can()` dans `AdminPage`/`AdminContent`. Le filtrage de la sidebar est piloté par `readableSections`.
