

## Système RBAC — Rôles personnalisés avec permissions CRUD granulaires

### Statut : Phases 1–3 terminées ✅

### Ce qui a été implémenté

1. **Tables de base de données** :
   - `custom_roles` : rôles personnalisés (nom, description, is_system)
   - `role_permissions` : permissions CRUD par section (clé hiérarchique avec notation pointée)
   - `user_custom_roles` : assignation utilisateur ↔ rôle (contrainte UNIQUE ajoutée)
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

### Migration legacy `user_roles` → `user_custom_roles` ✅

#### Phase 1 — Backfill + dual-write ✅
- Migration SQL : backfill `user_custom_roles` depuis `user_roles` (Admin/Superadmin/Monitoreo)
- Edge functions `create-user` et `manage-users` : écrivent dans les deux tables
- Express `server/routes/users.ts` : dual-write sur création, modification, suppression

#### Phase 2 — Fonctions SQL de sécurité réécrites ✅
- `has_admin_access()` → query `user_custom_roles JOIN custom_roles` (Admin/Superadmin)
- `has_read_access()` → query `user_custom_roles JOIN custom_roles` (tout rôle)
- `has_role(_user_id, _role)` → mapping legacy enum → custom_roles name
- **Toutes les RLS policies existantes (~20+) continuent de fonctionner sans modification**

#### Phase 3 — Express middleware + frontend ✅
- `server/middleware/auth.ts` : requireAdmin/requireAdminOrViewer/requireSuperAdmin utilisent `user_custom_roles JOIN custom_roles`
- `src/hooks/useAdminAuth.ts` : mode Supabase utilise `user_custom_roles` au lieu de `has_role` RPC
- `server/routes/users.ts` : listing, création, modification, suppression via nouvelles tables

#### Phase 4 — Nettoyage (à venir)
- Retirer le dual-write (ne plus écrire dans `user_roles`)
- Supprimer la table `user_roles` et l'enum `app_role`
- Fusionner `AdminUsersTab` dans `AdminGestionCuentasTab`

### Notes d'architecture

Les composants enfants (`AdminFichasTab`, `AdminEncuestas360Tab`, etc.) conservent leurs props `isViewer` pour compatibilité, mais les valeurs sont désormais calculées depuis `usePermissions.can()` dans `AdminPage`/`AdminContent`. Le filtrage de la sidebar est piloté par `readableSections`.
