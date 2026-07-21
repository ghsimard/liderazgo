## Diagnostic Yuly (CC 1037070409, Coordinadora, Institución Educativa Rural Samaná, Oriente 2026)

Résultats confirmés sur Render (production) :

| Vérification | Résultat |
|---|---|
| Role via `check_cedula_role` | `is_directivo: true`, `cargo_actual: Coordinador/a` ✅ |
| Ficha | ✅ region = `Oriente 2026`, nombre_ie = `Samaná` |
| `rubrica_asignaciones` (6 lignes) | 5 sur 6 ont `rubrica_visible = true` — la logique de MiPanel (`.limit(1)`) prend une seule ligne au hasard, donc résultat non déterministe |
| `encuesta_entrada_visible` / `encuesta_salida_visible` sur asignaciones | true pour toutes |
| `encuesta_360_visibility` matches pour son cédula / institution / region `Oriente 2026` | ❌ AUCUNE (la seule règle existante est `region = "Oriente"` sans "2026") |

### Causes racines

**1. Rúbricas masqué (intermittent)** — Dans `src/pages/MiPanel.tsx` (ligne 208-214) la requête sur `rubrica_asignaciones` fait un `.limit(1)` sans `order by`. Postgres peut retourner la ligne où `rubrica_visible = false` (celle avec Ángela María). Résultat : `rubricaEnabled = false` → bouton caché. C'est un bug côté frontend.

**2. Encuesta 360° masquée** — La logique `resolveVisibility` cherche une règle active pour son cédula → institution → région dans `encuesta_360_visibility`. Aucune règle ne matche `Oriente 2026` (seule `Oriente` existe). Retourne `false` → bouton caché.

### Plan d'action

🖥️ **Site statique (Frontend)** — Corriger le bug `.limit(1)` dans `src/pages/MiPanel.tsx` :

Remplacer la requête ligne 208-214 par une qui prend le MAX de `rubrica_visible` sur toutes les asignaciones du directivo, plutôt qu'une ligne arbitraire :

```ts
const { data: asigData } = await supabase
  .from("rubrica_asignaciones")
  .select("rubrica_visible")
  .eq("directivo_cedula", cedula);
const hasAsig = (asigData || []).some((r: any) => r.rubrica_visible === true);
setRubricaEnabled(hasAsig);
```

Cela garantit que si AU MOINS UN evaluador a activé la rúbrica pour ce directivo, elle s'affiche.

⚙️ **Web Service (Backend Express)** — Rien.

🗄️ **Base de données (SQL manuel sur Render via pgAdmin)** — Activer la visibilité 360° pour la région `Oriente 2026`. À exécuter :

```sql
INSERT INTO encuesta_360_visibility (fase, scope_type, scope_value, is_active)
VALUES 
  ('inicial', 'region', 'Oriente 2026', true),
  ('final',   'region', 'Oriente 2026', true)
ON CONFLICT (fase, scope_type, scope_value) 
DO UPDATE SET is_active = true, updated_at = now();
```

Après le déploiement frontend + l'INSERT SQL, Yuly devra faire **Ctrl+Shift+R**.

### Questions avant implémentation

1. Faut-il ouvrir la 360° pour **toute la région `Oriente 2026`**, ou juste **son institution** (`Samaná`), ou **elle uniquement** ?
2. Fases à activer : `inicial`, `final`, ou les deux ?

Confirme ces deux points et je passe en build.
