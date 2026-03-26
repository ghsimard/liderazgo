

## Plan: Synchroniser les noms dans la base Render (production)

La base Cloud est déjà synchronisée (0 divergences trouvées). Le problème est uniquement sur la base Render.

### Étape 1 — Diagnostic (à exécuter sur Render)

Exécuter ces requêtes SQL pour identifier les divergences :

```sql
-- 1. Noms divergents dans encuestas_360 (nombre_directivo)
SELECT e.id, e.cedula_directivo, e.nombre_directivo AS nom_encuesta, f.nombres_apellidos AS nom_ficha
FROM encuestas_360 e
JOIN fichas_rlt f ON f.numero_cedula = e.cedula_directivo
WHERE e.nombre_directivo IS DISTINCT FROM f.nombres_apellidos
  AND e.cedula_directivo IS NOT NULL;

-- 2. Noms divergents dans encuestas_360 (autoevaluaciones — nombre_completo)
SELECT e.id, e.cedula, e.nombre_completo AS nom_encuesta, f.nombres_apellidos AS nom_ficha
FROM encuestas_360 e
JOIN fichas_rlt f ON f.numero_cedula = e.cedula
WHERE e.tipo_formulario = 'autoevaluacion'
  AND e.nombre_completo IS DISTINCT FROM f.nombres_apellidos
  AND e.cedula IS NOT NULL;

-- 3. Noms divergents dans rubrica_asignaciones
SELECT ra.id, ra.directivo_cedula, ra.directivo_nombre AS nom_asignacion, f.nombres_apellidos AS nom_ficha
FROM rubrica_asignaciones ra
JOIN fichas_rlt f ON f.numero_cedula = ra.directivo_cedula
WHERE ra.directivo_nombre IS DISTINCT FROM f.nombres_apellidos;

-- 4. Noms divergents dans encuesta_invitaciones
SELECT ei.id, ei.directivo_cedula, ei.directivo_nombre AS nom_invitation, f.nombres_apellidos AS nom_ficha
FROM encuesta_invitaciones ei
JOIN fichas_rlt f ON f.numero_cedula = ei.directivo_cedula
WHERE ei.directivo_nombre IS DISTINCT FROM f.nombres_apellidos
  AND ei.directivo_cedula IS NOT NULL;
```

### Étape 2 — Correction (à exécuter sur Render après validation du diagnostic)

```sql
-- A. Corriger nombre_directivo dans encuestas_360
UPDATE encuestas_360 e
SET nombre_directivo = f.nombres_apellidos
FROM fichas_rlt f
WHERE f.numero_cedula = e.cedula_directivo
  AND e.nombre_directivo IS DISTINCT FROM f.nombres_apellidos
  AND e.cedula_directivo IS NOT NULL;

-- B. Corriger nombre_completo dans autoevaluaciones
UPDATE encuestas_360 e
SET nombre_completo = f.nombres_apellidos
FROM fichas_rlt f
WHERE f.numero_cedula = e.cedula
  AND e.tipo_formulario = 'autoevaluacion'
  AND e.nombre_completo IS DISTINCT FROM f.nombres_apellidos
  AND e.cedula IS NOT NULL;

-- C. Corriger directivo_nombre dans rubrica_asignaciones
UPDATE rubrica_asignaciones ra
SET directivo_nombre = f.nombres_apellidos
FROM fichas_rlt f
WHERE f.numero_cedula = ra.directivo_cedula
  AND ra.directivo_nombre IS DISTINCT FROM f.nombres_apellidos;

-- D. Corriger directivo_nombre dans encuesta_invitaciones
UPDATE encuesta_invitaciones ei
SET directivo_nombre = f.nombres_apellidos
FROM fichas_rlt f
WHERE f.numero_cedula = ei.directivo_cedula
  AND ei.directivo_nombre IS DISTINCT FROM f.nombres_apellidos
  AND ei.directivo_cedula IS NOT NULL;
```

### Étape 3 — Renforcer le code (optionnel, implémentation future)

Modifier `AdminEncuestaMonitor.tsx` pour matcher par **cédula** au lieu du nom (plan déjà proposé précédemment), ce qui rend le système résistant aux divergences futures.

### Actions requises

🗄️ **Base de données Render** : Exécuter les requêtes de diagnostic (étape 1), puis les corrections (étape 2) directement sur la base PostgreSQL de production Render.

Aucune modification de code n'est nécessaire pour cette correction ponctuelle.

