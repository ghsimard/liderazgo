## Contexte

En production, l'utilisateur ne voit pas certaines IE comme `Centro Educativo Rural Guamito` dans Ambiente Escolar / Monitoreo. En staging cette IE apparaît bien (via `fichas_rlt` où `region = 'Oriente 2026'`), donc l'écart est propre à la base Render.

## Hypothèse

En prod, `fichas_rlt.region` ne contient pas d'année (ex : `Oriente` au lieu de `Oriente 2026`). Le `JOIN f.region = c.nombre` de la vue retourne donc 0 pour Oriente 2026, et la seule source restante est `ae_cohorte_instituciones`. Deux causes possibles :

1. La migration **`2026-07-08c_v_ae_instituciones_restore_union.sql`** n'a pas encore été exécutée sur Render → la vue actuelle n'a plus le `UNION`, donc Guamito disparaît.
2. `ae_cohorte_instituciones` ne contient pas (ou plus) l'entrée `Centro Educativo Rural Guamito - San Luis` pour la cohorte Oriente 2026.

## Actions

### 🖥️ Site statique (Frontend)
Aucun changement.

### ⚙️ Web Service (Backend Express)
Aucun changement.

### 🗄️ Base de données (SQL manuel sur Render)

**Étape 1 — Diagnostic (SELECT seulement, à exécuter d'abord) :**

```sql
-- A. Définition actuelle de la vue en prod
SELECT pg_get_viewdef('public.v_ae_instituciones_por_cohorte'::regclass, true);

-- B. fichas_rlt : est-ce que Guamito existe et avec quelle region ?
SELECT nombre_ie, region FROM fichas_rlt WHERE nombre_ie ILIKE '%guamito%';

-- C. ae_cohorte_instituciones : est-ce que Guamito est rattaché à Oriente 2026 ?
SELECT c.nombre AS cohorte, aci.institucion_educativa
FROM ae_cohorte_instituciones aci
JOIN ae_cohortes c ON c.id = aci.cohorte_id
WHERE aci.institucion_educativa ILIKE '%guamito%';

-- D. Ce que renvoie la vue actuellement pour Guamito
SELECT c.nombre, v.institucion_educativa
FROM v_ae_instituciones_por_cohorte v
JOIN ae_cohortes c ON c.id = v.cohorte_id
WHERE v.institucion_educativa ILIKE '%guamito%';

-- E. Régions distinctes présentes dans fichas_rlt en prod
SELECT DISTINCT region FROM fichas_rlt ORDER BY region;
```

**Étape 2 — Selon le résultat :**

- **Si (A) montre une vue SANS `UNION ae_cohorte_instituciones`** → exécuter `server/migrations/2026-07-08c_v_ae_instituciones_restore_union.sql` (déjà présente au repo). Cette migration normalise les suffixes `" - Municipio"` uniquement si la version courte existe dans `fichas_rlt`, puis recrée la vue avec le `UNION`. **`fichas_rlt` reste intacte.**

- **Si (C) ne renvoie rien** → `ae_cohorte_instituciones` a perdu Guamito pour Oriente 2026 en prod. Corriger avec un `INSERT` ciblé (à préparer après confirmation du `cohorte_id` réel d'Oriente 2026) :
  ```sql
  INSERT INTO ae_cohorte_instituciones (cohorte_id, institucion_educativa)
  SELECT id, 'Centro Educativo Rural Guamito - San Luis'
  FROM ae_cohortes WHERE nombre = 'Oriente 2026'
  ON CONFLICT DO NOTHING;
  ```
  Puis rejouer l'étape 1 de la migration 08c pour normaliser le suffixe.

- **Si (B) montre `fichas_rlt.region = 'Oriente'` sans année** → confirme le diagnostic général : la vue *doit* garder le `UNION` (donc appliquer 08c est indispensable). **On ne modifie jamais `fichas_rlt`.**

**Étape 3 — Vérification :**

```sql
SELECT c.nombre, count(*) n
FROM v_ae_instituciones_por_cohorte v
JOIN ae_cohortes c ON c.id = v.cohorte_id
GROUP BY c.nombre ORDER BY c.nombre;

SELECT institucion_educativa FROM v_ae_instituciones_por_cohorte
WHERE institucion_educativa ILIKE '%guamito%';
```

Puis **Ctrl+Shift+R** dans le navigateur.

## Détails techniques

- Aucun code frontend/backend touché : le problème est uniquement dans la définition de la vue et/ou le contenu de `ae_cohorte_instituciones` en prod.
- `fichas_rlt` n'est jamais modifiée (contrainte projet).
- `ae_cohorte_instituciones` peut être corrigée par `INSERT` si une entrée manque — c'est une table de mapping legacy, pas une source de vérité utilisateur.
