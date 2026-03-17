

## Plan : Intégrer l'assignation de rôles custom dans AdminGestionCuentasTab

### Contexte

Actuellement, le formulaire Admin dans `AdminGestionCuentasTab` utilise un `Select` simple avec 3 valeurs hardcodées (`admin`, `superadmin`, `monitoreo`). Ces valeurs correspondent à `user_roles.role` (enum `app_role`). Le nouveau système RBAC utilise `custom_roles` + `user_custom_roles` pour des permissions granulaires.

### Modifications prévues

#### 1. Charger les custom_roles au montage

Dans `loadData()`, ajouter un fetch de `custom_roles` (table déjà existante avec 3 rôles système). Stocker dans un state `customRoles`. Aussi charger les `user_custom_roles` pour chaque admin user afin de savoir quel rôle custom est assigné.

#### 2. Remplacer le Select admin role par un Select de custom_roles

Dans la section Admin du dialogue (lignes 676-688), remplacer le Select hardcodé (`admin`/`superadmin`/`monitoreo`) par un Select peuplé dynamiquement depuis `customRoles`. Le state `adminRole` passera de `"admin"` (string enum) à un `role_id` UUID.

#### 3. Mapper custom_role → legacy role pour la création du user

Le système `user_roles` (enum `app_role`) reste nécessaire pour l'authentification et les RLS policies existantes. Lors de la création/mise à jour d'un admin :
- Déterminer le legacy role depuis le nom du custom_role : `"Superadmin"` → `superadmin`, `"Monitoreo"` → `monitoreo`, sinon → `admin`
- Continuer d'utiliser ce legacy role pour `create-user` / `manage-users`
- En plus, insérer/mettre à jour `user_custom_roles` avec le `role_id` sélectionné

#### 4. Sauvegarder le custom role dans handleSave

Après la création/mise à jour de l'admin user :
- `DELETE FROM user_custom_roles WHERE user_id = X`
- `INSERT INTO user_custom_roles (user_id, role_id) VALUES (X, selectedRoleId)`

#### 5. Afficher le nom du rôle custom dans le tableau

Dans la colonne "Roles", afficher le nom du custom_role assigné (si trouvé) au lieu du legacy role hardcodé.

#### 6. Enrichir UnifiedPerson

Ajouter `customRoleId?: string` et `customRoleName?: string` à l'interface `UnifiedPerson`. Remplir ces champs lors du `loadData()` en croisant `user_custom_roles` avec `custom_roles`.

### Fichiers modifiés

- **`src/components/admin/AdminGestionCuentasTab.tsx`** — seul fichier modifié

### Aucune migration DB nécessaire

Les tables `custom_roles`, `role_permissions`, `user_custom_roles` existent déjà avec les bonnes RLS policies.

