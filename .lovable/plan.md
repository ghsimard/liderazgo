
Objectif
- Empêcher définitivement un Admin (ex: wrewe) de modifier les permissions du rôle Superadmin, tout en laissant un Superadmin modifier n’importe quel rôle.

Constat (cause racine)
1) Mauvais signal “isSuperAdmin” côté UI :
- Dans `src/pages/AdminPage.tsx`, `AdminRolesTab` reçoit `isSuperAdmin={can("sistema.roles-permisos","delete")}`.
- Or `can(...)` hérite du parent `sistema`; l’Admin a `delete=true` sur `sistema`, donc il est traité à tort comme superadmin.
- Résultat: l’UI lui montre le rôle Superadmin et permet l’édition.

2) Garde backend insuffisante pour ce cas :
- Les policies actuelles de `role_permissions` autorisent tout Admin (`has_admin_access`) à INSERT/UPDATE/DELETE.
- Donc même si on corrige l’UI, un Admin pourrait encore modifier les permissions Superadmin via requêtes directes.

Plan d’implémentation
1) Corriger la source de vérité “superadmin” dans l’UI
- Fichier: `src/pages/AdminPage.tsx`
- Passer le vrai flag issu de `useAdminAuth()` au lieu de `can(...)`:
  - `AdminRolesTab isSuperAdmin={isSuperAdmin}`
  - Même correction sur les autres zones sensibles déjà branchées pareil (`AdminGestionCuentasTab`, `AdminActivityLogTab`) pour éviter d’autres élévations implicites.
- Adapter la signature de `AdminContent` pour recevoir `isSuperAdmin` et le propager aux tabs concernés.

2) Verrouiller côté composant des rôles (défense en profondeur)
- Fichier: `src/components/admin/AdminRolesTab.tsx`
- Conserver le masquage de la carte Superadmin pour non-superadmin.
- Ajouter une garde explicite dans les handlers de mutation (`togglePerm`, `toggleParentAll`, etc.) :
  - si `selectedRole.name === "Superadmin"` et `!isSuperAdmin` ⇒ bloquer immédiatement (retour + toast d’erreur).
- Ainsi, même en cas de régression UI future, l’action reste refusée côté composant.

3) Verrouiller au niveau base (vrai contrôle de sécurité)
- Nouvelle migration SQL dans `supabase/migrations/`
- Ajouter fonction:
  - `public.has_superadmin_access(_user_id uuid)` (SECURITY DEFINER, STABLE).
- Durcir les policies de `role_permissions` :
  - Admin peut lire.
  - INSERT/UPDATE/DELETE sur les lignes liées au rôle `Superadmin` uniquement si `has_superadmin_access(auth.uid())`.
  - Admin conserve la gestion des permissions des autres rôles.
- Option de durcissement recommandée (même logique) sur `custom_roles` et `user_custom_roles` pour empêcher toute manipulation du rôle Superadmin par un simple Admin.

4) Compatibilité mode Express (Render) pour éviter divergence
- Fichier: `server/routes/db.ts`
- Ajouter un contrôle serveur avant mutation sur tables RBAC (`role_permissions`, et idéalement `user_custom_roles/custom_roles`) :
  - Si caller n’est pas superadmin et cible liée au rôle Superadmin ⇒ 403.
- But: garantir le même comportement en mode API Express, même hors policies cloud.

Validation (recette)
1) Compte Admin `wrewe` :
- Ouvrir “Roles y Permisos”:
  - ne voit pas/ ne peut pas sélectionner Superadmin.
  - toute tentative de mutation Superadmin est refusée.
2) Compte Superadmin :
- peut modifier les permissions de tous les rôles (y compris Superadmin).
3) Test technique:
- tentative de update direct SQL/API sur `role_permissions` du rôle Superadmin avec token Admin => refus.
- même tentative avec Superadmin => succès.

Détails techniques (résumé)
- Problème principal: confusion entre “permission CRUD héritée” et “statut de rôle système”.
- Correction: “isSuperAdmin” doit venir uniquement de l’identité/roles utilisateur, jamais d’un `can(...)` sur une section.
- Sécurité robuste: UI + policies DB + garde Express pour couvrir tous les chemins d’écriture.
