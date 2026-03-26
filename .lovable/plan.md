

## Plan: Sécuriser le matching par cédula dans reporte360Calculator et AdminFichasTab + synchroniser la base de données

### État de la base de données

La base Cloud (Lovable) est **synchronisée** — 0 divergences trouvées dans toutes les tables.
La base **Render (production)** doit être corrigée manuellement avec les requêtes SQL fournies précédemment.

### Modifications de code

**1. `src/utils/reporte360Calculator.ts`**

La fonction `calcularReporte360` reçoit `nombreDirectivo` + `institucion`. Le matching actuel (lignes 105-111) compare par nom. Refactoring :

- D'abord, résoudre la cédula du directivo via `fichas_rlt` (déjà fait lignes 130-140 pour l'identification)
- Remonter cette requête avant le matching des encuestas
- Autoevaluación : `e.cedula === ficha.numero_cedula` au lieu de `e.nombre_completo === nombreDirectivo`
- Observateurs : `e.cedula_directivo === ficha.numero_cedula` au lieu de `e.nombre_directivo === nombreDirectivo`

**2. `src/components/admin/AdminFichasTab.tsx`** (lignes 222-264)

La suppression en cascade utilise le nom pour les encuestas_360. Refactoring :
- Ligne 223-227 : Fetch related encuestas par `cedula_directivo` et `cedula` au lieu de `nombre_directivo` et `nombre_completo`
- Ligne 263 : `delete().eq("cedula_directivo", cedula)` au lieu de `delete().eq("nombre_directivo", nombre)`
- Ligne 264 : `delete().eq("cedula", cedula).eq("tipo_formulario", "autoevaluacion")` au lieu de `delete().eq("nombre_completo", nombre)`

**3. `src/components/admin/AdminReporte360Tab.tsx`**

Ajouter `cedula` à l'objet `DirectivoOption` (depuis `f.numero_cedula`) et le passer à `calcularReporte360`.

**4. `src/utils/reporte360MelCalculator.ts`**

Adapter la signature pour accepter `cedula` en plus du nom et le propager.

### Synchronisation base Render (production)

SQL à exécuter manuellement sur Render :

```sql
-- A. Corriger nombre_directivo
UPDATE encuestas_360 e SET nombre_directivo = f.nombres_apellidos
FROM fichas_rlt f WHERE f.numero_cedula = e.cedula_directivo
AND e.nombre_directivo IS DISTINCT FROM f.nombres_apellidos AND e.cedula_directivo IS NOT NULL;

-- B. Corriger autoevaluaciones
UPDATE encuestas_360 e SET nombre_completo = f.nombres_apellidos
FROM fichas_rlt f WHERE f.numero_cedula = e.cedula
AND e.tipo_formulario = 'autoevaluacion' AND e.nombre_completo IS DISTINCT FROM f.nombres_apellidos AND e.cedula IS NOT NULL;

-- C. Corriger rubrica_asignaciones
UPDATE rubrica_asignaciones ra SET directivo_nombre = f.nombres_apellidos
FROM fichas_rlt f WHERE f.numero_cedula = ra.directivo_cedula
AND ra.directivo_nombre IS DISTINCT FROM f.nombres_apellidos;

-- D. Corriger encuesta_invitaciones
UPDATE encuesta_invitaciones ei SET directivo_nombre = f.nombres_apellidos
FROM fichas_rlt f WHERE f.numero_cedula = ei.directivo_cedula
AND ei.directivo_nombre IS DISTINCT FROM f.nombres_apellidos AND ei.directivo_cedula IS NOT NULL;
```

### Fichiers modifiés

- `src/utils/reporte360Calculator.ts`
- `src/utils/reporte360MelCalculator.ts`
- `src/components/admin/AdminReporte360Tab.tsx`
- `src/components/admin/AdminFichasTab.tsx`

