

## Plan : Toggle `rubrica_visible` depuis RubricaEvaluacion (évaluateur)

### 1. Migration BD

Ajouter la colonne `rubrica_visible` à `rubrica_asignaciones` :

```sql
ALTER TABLE rubrica_asignaciones ADD COLUMN rubrica_visible boolean NOT NULL DEFAULT false;
UPDATE rubrica_asignaciones SET rubrica_visible = true;
```

Les RLS existantes (public read, admin insert/update/delete) couvrent déjà les opérations nécessaires. Il faut ajouter une politique UPDATE pour permettre à l'évaluateur (public/anon) de modifier `rubrica_visible` :

```sql
CREATE POLICY "Public can update rubrica_visible"
ON rubrica_asignaciones FOR UPDATE TO public
USING (true) WITH CHECK (true);
```

### 2. `src/pages/RubricaEvaluacion.tsx`

**Interface** : Ajouter `rubrica_visible` à `Asignacion` (ligne ~60-64).

**Chargement** : Ajouter `rubrica_visible` au `select` (ligne ~325).

**UI — Liste des directivos** (lignes ~1093-1143) :
- Ajouter un bouton `Eye`/`EyeOff` à droite de chaque directivo dans la liste de sélection.
- Cliquer toggle `rubrica_visible` via `UPDATE rubrica_asignaciones SET rubrica_visible = !current WHERE directivo_cedula = X AND evaluador_id = Y`.
- Ajouter au-dessus de la liste deux petits boutons "Activar todos" / "Desactivar todos" qui font un `UPDATE` en masse.
- Mettre à jour le state local `asignaciones` après chaque toggle.

### 3. `src/pages/MiPanel.tsx`

Modifier la requête existante (ligne ~200-204) pour filtrer par `rubrica_visible = true` :

```typescript
const { count: asigCount } = await supabase
  .from("rubrica_asignaciones")
  .select("id", { count: "exact", head: true })
  .eq("directivo_cedula", cedula)
  .eq("rubrica_visible", true);
```

### Déploiement

- **Site statique** : Oui
- **Web Service** : Non  
- **Base de données** : Oui (1 migration)

