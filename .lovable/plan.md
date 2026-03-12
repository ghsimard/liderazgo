

## Plan

Rendre la colonne `updated_at` nullable et initialiser les valeurs existantes à `NULL`, pour que seules les fichas réellement modifiées après l'ajout de la colonne affichent une date.

### 1. Migration SQL

```sql
-- Rendre nullable
ALTER TABLE public.fichas_rlt ALTER COLUMN updated_at DROP NOT NULL;
-- Effacer les valeurs initialisées par défaut
UPDATE public.fichas_rlt SET updated_at = NULL;
-- Changer le default pour les nouvelles fichas
ALTER TABLE public.fichas_rlt ALTER COLUMN updated_at SET DEFAULT NULL;
```

Le trigger existant continuera à mettre `updated_at = now()` lors de chaque `UPDATE`, donc seules les fichas modifiées auront une date.

### 2. Code (`AdminFichasTab.tsx`)

Aucun changement nécessaire : `formatDateTime` retourne déjà `"—"` pour les valeurs nulles.

### 3. Production

Exécuter la même requête SQL via pgAdmin 4 sur la base Render.

