

## Diagnostic — Stats vides quand une région est sélectionnée

### Cause probable
Dans `AdminSatisfaccionStats.tsx` (ligne 57), le filtre est :
```ts
if (filterRegion !== "all") query = query.eq("region", filterRegion);
```

La liste déroulante est alimentée par `regiones.nombre` (ex. **"Quibdó 2026"**, **"Oriente 2026"**), tandis que la colonne `satisfaccion_responses.region` est remplie au moment de la soumission depuis `fichas_rlt.region` (ex. **"Quibdó"** sans suffixe d'année, ou différence de casse/accent).

Quand `"all"` → aucun filtre → tout s'affiche.
Quand une région est choisie → `eq("region", "Quibdó 2026")` retourne 0 ligne → bloc "Sin datos".

### Plan de correction

**Étape 1 — Vérification (1 requête diagnostique)**
Exécuter côté Render pour confirmer le mismatch :
```sql
SELECT DISTINCT region FROM satisfaccion_responses ORDER BY region;
SELECT DISTINCT nombre FROM regiones ORDER BY nombre;
```
→ Comparer les deux listes pour voir l'écart exact (suffixe année, accent, espaces).

**Étape 2 — Correctif frontend (`AdminSatisfaccionStats.tsx`)**

Remplacer le filtre strict par une **comparaison normalisée côté client** (cohérent avec la contrainte du proxy Express qui ne supporte pas `ilike`/`like` complexes — voir `mem://tech/db-shim-proxy-architecture`) :

1. Récupérer **toutes** les réponses du `form_type`/`module` choisis (sans `eq` sur region).
2. Filtrer en JS avec une fonction de normalisation :
   ```ts
   const norm = (s: string) => (s || "").toLowerCase().normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "").replace(/\s*\d{4}\s*$/, "").trim();
   const filtered = filterRegion === "all" 
     ? data 
     : data.filter(r => norm(r.region) === norm(filterRegion));
   ```
   → Tolère : accents, casse, suffixe année (« 2026 »), espaces.

**Étape 3 — Affichage informatif quand 0 résultat**
Remplacer le bloc « Sin datos para generar estadísticas » par un message qui distingue :
- *« No hay respuestas registradas con este filtro. »* + un compteur indiquant combien de respuestas existent au total pour ce tipo+módulo (toutes régions confondues), pour aider le diagnostic.

**Étape 4 — Cohérence**
Appliquer la même normalisation dans :
- `AdminSatisfaccionReportTab.tsx` (filtre région du rapport)
- `AdminSatisfaccionCommentsTab.tsx` (filtre région des commentaires)

### Récap déploiement

| Cible | Action |
|---|---|
| 🖥️ Site statique (Frontend) | **Redéployer** (logique de filtre normalisée) |
| ⚙️ Web Service (Backend Express) | Aucune |
| 🗄️ Base de données | Aucune (option : long terme, normaliser `fichas_rlt.region` pour matcher `regiones.nombre` — à discuter séparément) |

