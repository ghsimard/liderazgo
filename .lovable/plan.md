

## Probleme

La route Express `GET /api/users` (server/routes/users.ts, lignes 13-27) ne fait **pas de JOIN** avec la table `admin_cedulas`. Elle retourne uniquement `id, email, created_at, last_sign_in_at, roles` — sans `cedula`. Le frontend reçoit donc `cedula: undefined` pour tous les admins/superadmins.

## Solution

Modifier la requête SQL dans `GET /api/users` pour joindre `admin_cedulas` :

**Fichier : `server/routes/users.ts`** (lignes 15-22)

Changer la requête de :
```sql
SELECT u.id, u.email, u.created_at, u.last_sign_in_at,
       COALESCE(json_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), '[]') AS roles
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
GROUP BY u.id
```

En :
```sql
SELECT u.id, u.email, u.created_at, u.last_sign_in_at,
       COALESCE(json_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), '[]') AS roles,
       ac.cedula
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN admin_cedulas ac ON ac.user_id = u.id
GROUP BY u.id, ac.cedula
```

C'est un changement d'une seule requête SQL — aucune modification frontend nécessaire car le composant `AdminGestionCuentasTab` lit déjà `u.cedula`.

