

## Plan: Appliquer le genre aux titres (Rector/a → Rector ou Rectora) dans Encuestas 360

Le champ `cargo_directivo` dans `encuestas_360` stocke la forme neutre ("Rector/a", "Coordinador/a"). Il faut afficher la forme genrée selon le champ `genero` de la fiche du directivo.

### Modification

**Fichier** : `src/components/admin/AdminEncuestas360Tab.tsx`

1. **Ajouter l'import** de `genderizeRole` depuis `@/utils/genderizeRole`

2. **Charger les genres** : après le fetch des encuestas, récupérer les `fichas_rlt` avec `numero_cedula` et `genero`. Construire un `Map<string, string>` (cédula → genero).

3. **Appliquer `genderizeRole`** partout où `cargo_directivo` est affiché :
   - Ligne 533 : `cargo: genderizeRole(e.cargo_directivo, generoMap.get(e.cedula_directivo ?? ""))`
   - Ligne 542 : `{group.cargo}` — déjà genré via l'étape précédente
   - Ligne 641 (modale détail) : `genderizeRole(selectedEncuesta.cargo_directivo, generoMap.get(selectedEncuesta.cedula_directivo ?? ""))`

**Fichier** : `src/components/admin/AdminEncuestaMonitor.tsx`

Le monitor ne montre pas le cargo, donc aucun changement nécessaire.

### Détail technique

- La requête fichas est légère : `select("numero_cedula, genero")` sur tous les directivos
- Le `generoMap` est construit une seule fois au chargement et stocké en state
- `genderizeRole("Rector/a", "Masculino")` → `"Rector"`, `genderizeRole("Rector/a", "Femenino")` → `"Rectora"`

### Fichier modifié

- `src/components/admin/AdminEncuestas360Tab.tsx`

