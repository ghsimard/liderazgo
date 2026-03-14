

## Plan: Système d'opérateurs avec compatibilité Render

### Résumé

Créer une table `operator_permissions`, mettre à jour la détection de rôle par cédula, ajouter une page `/operador`, et un onglet admin pour gérer les opérateurs. Tout doit fonctionner sur les deux environnements (Lovable Cloud et Render/Express).

### 1. Migration DB (Lovable Cloud)

Créer la table `operator_permissions` via l'outil de migration Supabase + mettre à jour la fonction `check_cedula_role` pour retourner `is_operator`.

### 2. Migration Render — Instructions manuelles

Après implémentation, exécuter ce SQL sur la base PostgreSQL Render :

```sql
-- 1. Table operator_permissions
CREATE TABLE IF NOT EXISTS public.operator_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula TEXT NOT NULL,
  nombre TEXT NOT NULL DEFAULT '',
  section TEXT NOT NULL,
  region TEXT,
  entidad TEXT,
  institucion TEXT,
  module_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operator_permissions_cedula
  ON public.operator_permissions(cedula);

-- 2. Mettre à jour check_cedula_role pour ajouter is_operator
CREATE OR REPLACE FUNCTION public.check_cedula_role(p_cedula text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'exists_ficha', EXISTS (SELECT 1 FROM fichas_rlt WHERE numero_cedula = p_cedula),
    'is_admin', EXISTS (SELECT 1 FROM admin_cedulas WHERE cedula = p_cedula),
    'is_directivo', EXISTS (
      SELECT 1 FROM fichas_rlt
      WHERE numero_cedula = p_cedula
        AND cargo_actual IN ('Rector/a', 'Coordinador/a')
    ),
    'is_evaluador', EXISTS (SELECT 1 FROM rubrica_evaluadores WHERE cedula = p_cedula),
    'is_operator', EXISTS (SELECT 1 FROM operator_permissions WHERE cedula = p_cedula),
    'cargo_actual', (SELECT cargo_actual FROM fichas_rlt WHERE numero_cedula = p_cedula LIMIT 1),
    'nombre', COALESCE(
      (SELECT nombres_apellidos FROM fichas_rlt WHERE numero_cedula = p_cedula LIMIT 1),
      (SELECT nombre FROM rubrica_evaluadores WHERE cedula = p_cedula LIMIT 1)
    ),
    'genero', (SELECT genero FROM fichas_rlt WHERE numero_cedula = p_cedula LIMIT 1)
  );
$$;
```

Ajouter aussi dans `server/schema.sql` le même SQL pour les futures installations.

### 3. Express RPC (Render)

Mettre à jour `server/routes/rpc.ts` — l'endpoint `check_cedula_role` :
- Ajouter une requête `is_operator` : `SELECT EXISTS (SELECT 1 FROM operator_permissions WHERE cedula = $1)`
- Retourner `is_operator` dans la réponse JSON

### 4. Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| Migration SQL (Supabase) | Table `operator_permissions` + RLS + fonction `check_cedula_role` mise à jour |
| `server/schema.sql` | Ajouter table `operator_permissions` + fonction mise à jour |
| `server/routes/rpc.ts` | Ajouter `is_operator` dans l'endpoint `check_cedula_role` |
| `server/routes/export.ts` | Ajouter `operator_permissions` dans `TABLE_ORDER` |
| `src/pages/Index.tsx` | Détecter `is_operator`, rediriger vers `/operador` |
| `src/pages/OperadorPanel.tsx` | **Nouveau** — charge permissions par cédula, affiche sections autorisées |
| `src/components/admin/AdminOperadoresTab.tsx` | **Nouveau** — CRUD opérateurs dans l'admin |
| `src/components/admin/AdminSidebar.tsx` | Ajouter onglet "Opérateurs" dans section Système |
| `src/pages/AdminPage.tsx` | Rendre `AdminOperadoresTab` |
| `src/App.tsx` | Ajouter route `/operador` |

### 5. RLS (Lovable Cloud uniquement)

- `operator_permissions` : SELECT public (pour que l'opérateur puisse lire ses propres permissions), INSERT/UPDATE/DELETE réservés aux admins via `has_admin_access(auth.uid())`

### 6. Compatibilité Render — Récapitulatif

- La table `operator_permissions` sera accessible via le proxy DB Express existant (pas de jointures complexes)
- L'endpoint RPC Express sera mis à jour manuellement
- Le `dbClient` shim fonctionnera sans modification car il s'agit de requêtes simples (select/insert/update/delete sur une seule table)
- `server/schema.sql` sera mis à jour pour les nouvelles installations Render

### Étape recommandée

Implémenter tout en une fois : DB + admin UI + page opérateur + routing. Commencer avec Asistencia comme première section testable.

