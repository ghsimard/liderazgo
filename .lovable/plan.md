# Problème : une opératrice ne voit pas Asistencia sur Render (prod)

## Cause racine

Dans le panneau Opérateur, l'app appelle :

```ts
supabase.from("operator_permissions").select("*").eq("cedula", cedula)
```

Sur **Render (production)**, ce `supabase` est en réalité le proxy Express (`@/utils/dbClient`). Le proxy, dans `server/routes/db.ts`, définit une liste blanche `PUBLIC_READ_TABLES` — les tables lisibles sans token JWT.

**`operator_permissions` n'est PAS dans cette liste** → Express renvoie **401 « Authentification requise »**, parce que l'opératrice s'identifie uniquement avec `user_cedula` en sessionStorage (pas de `auth_token` JWT).

Résultat : `permissions = []` → le panneau affiche *« No tiene permisos asignados »*, ou bien les cartes (Asistencia, etc.) n'apparaissent jamais. Dans la preview Lovable ça fonctionne parce que le dbClient y attaque Supabase directement et les policies RLS sont différentes.

Les tables consommées ensuite par Asistencia (`fichas_rlt`, `informe_asistencia`) **sont déjà** dans `PUBLIC_READ_TABLES` — donc dès que la première étape est corrigée, le reste se charge.

## Changement proposé

### ⚙️ Web Service (Backend Express, `server/routes/db.ts`)

Ajouter `operator_permissions` à `PUBLIC_READ_TABLES` pour autoriser la lecture par cédula sans JWT (comme le font déjà `fichas_rlt`, `informe_asistencia`, etc.).

```ts
const PUBLIC_READ_TABLES = new Set([
  ...,
  "operator_permissions",   // ← ajouter
]);
```

Les écritures (insert/update/delete) **restent réservées aux Admin/Superadmin**, car on ne touche pas à `PUBLIC_INSERT_TABLES`, `PUBLIC_UPDATE_TABLES`, `PUBLIC_DELETE_TABLES`.

### 🖥️ Site statique (Frontend)
Aucun changement.

### 🗄️ Base de données (SQL manuel)
Aucun changement (la table existe déjà ; sa RLS Supabase est indépendante du proxy Render).

## Risque

Minimal. La table ne contient que des assignations de permissions (cédula + section + région). Pas de PII sensible. La cédula est utilisée comme filtre `.eq("cedula", ...)` côté client ; n'importe qui pourrait théoriquement interroger les permissions d'une autre cédula, ce qui reste cohérent avec le pattern déjà appliqué à `fichas_rlt` et aux autres tables opérationnelles.

## Déploiement

Après merge du changement sur GitHub, Render redéploie le Web Service automatiquement. Aucune migration SQL.
