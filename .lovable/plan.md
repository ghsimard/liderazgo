
Objectif: corriger le crash Render dans “Sistema → Roles y Permisos” (`TypeError: a.map is not a function`) et stabiliser le flux RBAC côté UI.

1) Diagnostic ciblé (cause racine)
- Le crash vient de `AdminRolesTab` au moment du rendu de `roles.map(...)`.
- En mode Render (Express), `fetchRoles()` utilise `apiFetch("/api/db/custom_roles...")` et récupère un objet `{ data: [...] }` (wrapper), pas un tableau direct.
- Cet objet est stocké tel quel dans `roles`, puis `.map()` plante.
- Même fichier: autres incohérences en mode Express (filtre mal formé `role_id=eq...`, mutations `PATCH/DELETE` vers `/api/db` qui ne supporte pas ces verbes) => comportements instables même après suppression du crash.

2) Refactor d’accès données dans `AdminRolesTab` (correctif principal)
- Supprimer les branches `USE_EXPRESS` dans ce composant pour les opérations RBAC.
- Utiliser uniquement `supabase` depuis `@/utils/dbClient` (déjà dual-mode et compatible Render):
  - rôles: `supabase.from("custom_roles").select("*").order(...)`
  - permissions: `supabase.from("role_permissions").select("*").eq("role_id", roleId)`
  - create/update/delete via query builder (`insert/update/delete`) au lieu de `apiFetch` direct.
- Résultat: plus de mismatch de format, plus d’URL/filtre incompatibles, et mutations cohérentes en Render + Cloud.

3) Garde-fous UI anti-crash
- Dans `AdminRolesTab`, normaliser toutes les lectures réseau:
  - `setRoles(Array.isArray(data) ? data : [])`
  - `setPermissions(Array.isArray(data) ? data : [])`
- Sur réponses inattendues: toast d’erreur non bloquant + fallback tableau vide.
- Option de hardening additionnelle (préventif): même garde-fou dans `usePermissions` pour éviter tout futur `.map/.filter` sur payload non-array.

4) Validation fonctionnelle après correctif
- Test E2E Render avec compte admin:
  - Connexion admin
  - `/admin?tab=sistema`
  - Ouvrir “Roles y Permisos” (vérifier absence de crash)
  - Vérifier affichage des cartes de rôles
  - Sélectionner un rôle, confirmer que seules ses permissions se chargent
  - Basculer un droit CRUD, recharger la page, vérifier persistance
  - Vérifier restrictions rôle système vs superadmin
- Test non-régression rapide:
  - Onglet “Cuentas” et navigation sidebar système toujours OK.

Fichiers concernés
- `src/components/admin/AdminRolesTab.tsx` (principal)
- `src/hooks/usePermissions.ts` (durcissement optionnel)

Détails techniques (résumé)
- Problème de contrat de réponse: `apiFetch` retourne le JSON brut; `/api/db/*` renvoie `{ data: [...] }`.
- `dbClient` fait déjà l’unwrapping (`data?.data ?? data`) + protocole mutation compatible Express.
- En réutilisant `dbClient` partout dans ce composant RBAC, on supprime à la fois:
  - le crash `.map`,
  - les filtres Express incorrects,
  - les mutations HTTP non supportées.
