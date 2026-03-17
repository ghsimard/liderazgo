

## Plan : Migration complète du legacy `user_roles` vers le RBAC `custom_roles`

### État des lieux

Le legacy `user_roles` (enum `app_role`: admin/superadmin/monitoreo) est utilisé dans **5 couches** :

```text
┌─────────────────────────────────────────────┐
│ 1. RLS Policies (~20+)                      │
│    → has_admin_access(), has_read_access(),  │
│      has_role()                              │
├─────────────────────────────────────────────┤
│ 2. Edge Functions (4)                       │
│    → create-user, manage-users, send-email, │
│      export-database                        │
├─────────────────────────────────────────────┤
│ 3. Express Middleware                       │
│    → requireAdmin, requireAdminOrViewer,    │
│      requireSuperAdmin                      │
├─────────────────────────────────────────────┤
│ 4. Express Routes                           │
│    → users.ts, db.ts                        │
├─────────────────────────────────────────────┤
│ 5. Frontend                                 │
│    → useAdminAuth.ts, AdminUsersTab         │
└─────────────────────────────────────────────┘
```

### Stratégie recommandée : Migration en 4 phases

---

#### Phase 1 — Backfill + dual-write (sans risque)

**Migration SQL** : Insérer dans `user_custom_roles` une entrée pour chaque user existant dans `user_roles`, en mappant vers le `custom_role` correspondant (Admin/Superadmin/Monitoreo). Idempotent avec `ON CONFLICT DO NOTHING`.

**Modifier les points d'écriture** (edge functions `create-user`, `manage-users`, Express `users.ts`) pour écrire dans les **deux** tables à chaque création/modification/suppression d'utilisateur. Ainsi la nouvelle table est toujours synchronisée.

**Fichiers** : migration SQL, `supabase/functions/create-user/index.ts`, `supabase/functions/manage-users/index.ts`, `server/routes/users.ts`

---

#### Phase 2 — Réécrire les fonctions SQL de sécurité

Modifier `has_admin_access()`, `has_read_access()`, et `has_role()` pour qu'elles interrogent `user_custom_roles` JOIN `custom_roles` au lieu de `user_roles`. La logique :
- `has_admin_access` → user a un custom_role dont le nom est "Admin" ou "Superadmin"
- `has_read_access` → user a n'importe quel custom_role (Admin, Superadmin, ou Monitoreo)
- `has_role('admin')` → custom_role.name = 'Admin', etc.

Les **RLS policies ne changent pas** — elles appellent toujours les mêmes fonctions, seule l'implémentation interne change.

**Fichiers** : 1 migration SQL uniquement

---

#### Phase 3 — Réécrire Express middleware + frontend

**Express middleware** (`server/middleware/auth.ts`) : remplacer les queries `SELECT FROM user_roles` par des queries sur `user_custom_roles JOIN custom_roles`.

**`useAdminAuth.ts`** : remplacer les appels `has_role` RPC par un appel à `get_user_permissions` (déjà basé sur le nouveau système), ou par une query sur `user_custom_roles`.

**`AdminUsersTab.tsx`** : supprimer ce composant legacy ou le fusionner dans `AdminGestionCuentasTab`.

**Fichiers** : `server/middleware/auth.ts`, `src/hooks/useAdminAuth.ts`, `server/routes/users.ts`, `server/routes/db.ts`

---

#### Phase 4 — Nettoyage

- Retirer le dual-write des edge functions et routes Express (ne plus écrire dans `user_roles`)
- Supprimer la table `user_roles` et l'enum `app_role` via migration
- Supprimer `AdminUsersTab.tsx` si fusionné

---

### Recommandation

Je recommande d'implémenter les **phases 1 et 2 ensemble** — c'est le changement le plus critique (backfill + basculer les fonctions de sécurité). Les phases 3 et 4 peuvent suivre dans des itérations séparées.

Voulez-vous que j'implémente les phases 1+2 ?

