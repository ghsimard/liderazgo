

## Plan: Mettre à jour `server/schema.sql` avec les éléments manquants

Après comparaison entre le schéma Supabase actuel et le fichier `server/schema.sql`, voici les éléments manquants :

### Éléments manquants à ajouter

**1. Table `encuesta_360_visibility`** — Utilisée dans 5 fichiers frontend pour gérer la visibilité des encuestas par fase/région/institution.

```sql
CREATE TABLE IF NOT EXISTS public.encuesta_360_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fase TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_value TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fase, scope_type, scope_value)
);
```

**2. Table `domains_360`** — Table de configuration des domaines de la 360° (référencée dans le whitelist db.ts et les composants admin).

```sql
CREATE TABLE IF NOT EXISTS public.domains_360 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
```

**3. Colonnes manquantes sur `rubrica_asignaciones`** — `rubrica_visible`, `encuesta_entrada_visible`, `encuesta_salida_visible`

```sql
ALTER TABLE public.rubrica_asignaciones ADD COLUMN IF NOT EXISTS rubrica_visible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.rubrica_asignaciones ADD COLUMN IF NOT EXISTS encuesta_entrada_visible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.rubrica_asignaciones ADD COLUMN IF NOT EXISTS encuesta_salida_visible BOOLEAN NOT NULL DEFAULT false;
```

**4. Trigger `update_fichas_rlt_updated_at`** — Pour mettre à jour `updated_at` sur `fichas_rlt` automatiquement.

```sql
ALTER TABLE public.fichas_rlt ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE FUNCTION public.update_fichas_rlt_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_fichas_rlt_updated_at ON public.fichas_rlt;
CREATE TRIGGER trg_fichas_rlt_updated_at BEFORE UPDATE ON public.fichas_rlt
  FOR EACH ROW EXECUTE FUNCTION update_fichas_rlt_updated_at();
```

**5. Fonction `has_superadmin_access`** — Manquante, utilisée dans le RBAC.

```sql
CREATE OR REPLACE FUNCTION public.has_superadmin_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_custom_roles ucr
    JOIN public.custom_roles cr ON cr.id = ucr.role_id
    WHERE ucr.user_id = _user_id AND cr.name = 'Superadmin'
  )
$$;
```

**6. `is_operator` dans `check_cedula_role`** — La fonction existante ne vérifie pas `operator_permissions`. La version Supabase inclut cette vérification.

**7. Trigger `update_rubrica_updated_at`** — Pour `rubrica_evaluaciones.updated_at`.

```sql
CREATE OR REPLACE FUNCTION public.update_rubrica_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_rubrica_evaluaciones_updated_at ON public.rubrica_evaluaciones;
CREATE TRIGGER trg_rubrica_evaluaciones_updated_at BEFORE UPDATE ON public.rubrica_evaluaciones
  FOR EACH ROW EXECUTE FUNCTION update_rubrica_updated_at();
```

### Détail technique

Toutes les modifications seront ajoutées à la fin de `server/schema.sql` en blocs idempotents (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP TRIGGER IF EXISTS`). La fonction `check_cedula_role` sera mise à jour pour inclure `is_operator`.

### Fichier modifié

- `server/schema.sql`

