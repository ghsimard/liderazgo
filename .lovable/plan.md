

## Plan: Ajouter le rôle "viewer" (lecture seule)

### Objectif
Créer un rôle `viewer` permettant à une personne de se connecter via email/password et consulter toutes les sections de l'admin **sauf Sistema**, en mode **lecture seule** (pas de boutons créer, modifier, supprimer, exporter).

### 1. Base de données

**Migration SQL** : Ajouter `viewer` à l'enum `app_role`.

```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';
```

Aucune nouvelle table requise. Le rôle sera assigné via `user_roles` comme pour admin/superadmin.

### 2. Authentification (`useAdminAuth.ts`)

- Accepter le rôle `viewer` en plus de `admin`/`superadmin` pour autoriser l'accès au panel.
- Exposer un nouveau booléen `isViewer` (true uniquement si le rôle est viewer et pas admin/superadmin).
- Côté Express : vérifier que `/api/auth/me` + middleware acceptent aussi `viewer`.
- Côté Supabase/Cloud : ajouter `has_role(uid, 'viewer')` dans la vérification.

### 3. Backend Express

- **`server/middleware/auth.ts`** : Ajouter un middleware `requireAdminOrViewer` qui accepte les rôles `admin`, `superadmin` et `viewer`.
- **`server/routes/auth.ts` (`/me`)** : Déjà OK, retourne tous les rôles.
- **`server/routes/users.ts`** : Permettre aux admins de créer un utilisateur avec le rôle `viewer`.

### 4. Edge Function `create-user`

Accepter `makeViewer` comme option pour assigner le rôle `viewer`.

### 5. Interface Admin (`AdminPage.tsx`)

- Passer `isViewer` à `AdminSidebar` et `AdminContent`.
- **Sidebar** : Masquer la section "Sistema" quand `isViewer === true`.
- **Header** : Masquer le bouton "Export SQL" pour les viewers.

### 6. Mode lecture seule dans les composants

Passer une prop `readOnly` (dérivée de `isViewer`) aux composants de contenu principaux. Les composants concernés :

- `AdminFichasTab` / `AdminEncuestas360Tab` / `AdminRubricasTab` / `AdminInformeModuloTab` / `AdminAmbienteMonitorTab` / `AdminSatisfaccionesTab` / `AdminMelTab` etc.

En mode `readOnly` :
- Masquer les boutons d'action (créer, modifier, supprimer, assigner).
- Garder la consultation, les filtres, la recherche et le téléchargement de rapports PDF.

L'implémentation sera progressive : on commencera par cacher les actions les plus critiques (suppression, édition, création) au niveau global, puis on affinera composant par composant.

### 7. Gestion des comptes (`AdminGestionCuentasTab`)

Permettre aux admins d'attribuer le rôle `viewer` lors de la création/modification d'un compte.

### Résumé des fichiers modifiés

| Fichier | Changement |
|---|---|
| Migration SQL | `ALTER TYPE app_role ADD VALUE 'viewer'` |
| `useAdminAuth.ts` | Accepter viewer, exposer `isViewer` |
| `server/middleware/auth.ts` | Ajouter `requireAdminOrViewer` |
| `server/routes/users.ts` | Accepter rôle viewer à la création |
| `supabase/functions/create-user/index.ts` | Accepter `makeViewer` |
| `AdminPage.tsx` | Passer `isViewer`, masquer Sistema, propager `readOnly` |
| `AdminSidebar.tsx` | Masquer Sistema si viewer |
| `AdminGestionCuentasTab.tsx` | Option rôle viewer |
| Composants admin (progressif) | Prop `readOnly` pour masquer les actions d'écriture |

