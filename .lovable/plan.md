

## Plan : Endpoint Express `/api/user-permissions/:userId`

### Contexte

Le hook `usePermissions` appelle déjà `apiFetch("/api/user-permissions/${userId}")` en mode Express. Il faut créer cet endpoint côté serveur qui reproduit la logique de la fonction SQL `get_user_permissions`.

### Modifications

#### 1. Ajouter la route dans `server/index.ts`

Ajouter un endpoint protégé par `requireAuth` + `requireAdminOrViewer` :

```typescript
GET /api/user-permissions/:userId
```

La requête SQL est identique à la fonction Supabase `get_user_permissions` :

```sql
SELECT DISTINCT rp.section,
  bool_or(rp.can_create) as can_create,
  bool_or(rp.can_read) as can_read,
  bool_or(rp.can_update) as can_update,
  bool_or(rp.can_delete) as can_delete
FROM user_custom_roles ucr
JOIN role_permissions rp ON rp.role_id = ucr.role_id
WHERE ucr.user_id = $1
GROUP BY rp.section
```

L'endpoint sera ajouté directement dans `server/index.ts` (comme les autres endpoints publics/simples déjà présents), protégé par les middlewares `requireAuth` et `requireAdminOrViewer` importés depuis `server/middleware/auth.ts`.

### Fichier modifié

- **`server/index.ts`** — ajout d'un `app.get("/api/user-permissions/:userId", requireAuth, requireAdminOrViewer, handler)`

### Validation UUID

Le paramètre `:userId` sera validé par regex avant l'exécution de la requête SQL pour éviter toute injection.

