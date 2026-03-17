

## Système RBAC — Rôles personnalisés avec permissions CRUD granulaires

### Statut : Migration complète ✅ (Phases 1–4 terminées)

### Ce qui a été implémenté

1. **Tables de base de données** :
   - `custom_roles` : rôles personnalisés (nom, description, is_system)
   - `role_permissions` : permissions CRUD par section (clé hiérarchique avec notation pointée)
   - `user_custom_roles` : assignation utilisateur ↔ rôle (contrainte UNIQUE)
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

### Migration legacy complète ✅

#### Phase 1 — Backfill ✅
- Migration SQL : backfill `user_custom_roles` depuis `user_roles` (Admin/Superadmin/Monitoreo)

#### Phase 2 — Fonctions SQL de sécurité réécrites ✅
- `has_admin_access()` → query `user_custom_roles JOIN custom_roles` (Admin/Superadmin)
- `has_read_access()` → query `user_custom_roles JOIN custom_roles` (tout rôle)
- **Toutes les RLS policies existantes (~20+) continuent de fonctionner sans modification**

#### Phase 3 — Express middleware + frontend ✅
- `server/middleware/auth.ts` : requireAdmin/requireAdminOrViewer/requireSuperAdmin utilisent `user_custom_roles JOIN custom_roles`
- `src/hooks/useAdminAuth.ts` : mode Supabase utilise `user_custom_roles` au lieu de `has_role` RPC
- `server/routes/auth.ts` : /api/auth/me retourne les rôles depuis `user_custom_roles`
- `server/routes/users.ts` : listing, création, modification, suppression via nouvelles tables
- `server/routes/db.ts` : whitelist et vérification admin via nouvelles tables
- `server/routes/export.ts` : export SQL via `user_custom_roles`

#### Phase 4 — Nettoyage ✅
- Dual-write retiré de toutes les edge functions et routes Express
- 14 RLS policies réécrites pour utiliser `has_admin_access()` au lieu de `has_role(_, app_role)`
- Fonction `has_role(uuid, app_role)` supprimée
- Table `user_roles` supprimée
- Type enum `app_role` supprimé
- Edge function `export-database` et frontend (`AppFooter`, `useAutoFillUserInfo`) migrés

### Notes d'architecture

Les composants enfants (`AdminFichasTab`, `AdminEncuestas360Tab`, etc.) conservent leurs props `isViewer` pour compatibilité, mais les valeurs sont désormais calculées depuis `usePermissions.can()` dans `AdminPage`/`AdminContent`. Le filtrage de la sidebar est piloté par `readableSections`.
