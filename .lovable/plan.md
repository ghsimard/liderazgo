

## Analyse du code mort

Après inspection complète du codebase, il y a **très peu de code mort**. Voici les éléments identifiés :

### 1. `src/pages/AdminDashboard.tsx` — **Fichier mort**
- N'est importé nulle part dans l'application
- N'a aucune route dans `App.tsx`
- Probablement un ancien dashboard remplacé par `AdminPage.tsx`
- **Action** : Supprimer le fichier

### 2. `src/components/NavLink.tsx` — **Fichier mort**
- N'est importé par aucun autre fichier (ne contient que des auto-références internes)
- **Action** : Supprimer le fichier

### 3. `server/schema.sql` — **Références legacy `user_roles`**
- Ce fichier (utilisé pour Render) contient encore la table `user_roles`, le type `app_role` et la fonction `has_role()` — tous supprimés côté Supabase en Phase 4
- **Action** : Mettre à jour `schema.sql` pour utiliser `custom_roles` / `user_custom_roles` / `has_admin_access()` au lieu de l'ancien système

### Verdict

L'application est **plutôt propre**. Seulement 2 fichiers complètement morts et 1 fichier de schéma Render à synchroniser. Tous les composants admin, les utilitaires PDF, les hooks et les pages de formulaires sont activement utilisés.

### Plan d'action (3 changements)

1. Supprimer `src/pages/AdminDashboard.tsx`
2. Supprimer `src/components/NavLink.tsx`
3. Mettre à jour `server/schema.sql` : remplacer `user_roles` / `app_role` / `has_role` par le système RBAC actuel (`custom_roles`, `user_custom_roles`, `has_admin_access`, `has_read_access`, `get_user_permissions`)

