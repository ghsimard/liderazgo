

## Plan — Statistiques Asistencia basées sur `informe_asistencia`

### Diagnostic

Quand l'utilisateur sélectionne **"Asistencia"** dans `Admin → Satisfacciones → Estadísticas`, le code actuel (`AdminSatisfaccionStats.tsx`) interroge `satisfaccion_responses` avec `form_type='asistencia'`. Or :

- `satisfaccion_responses` ne contient **aucune** ligne `asistencia` en prod (confirmé).
- Les **vraies** données d'assistance sont dans la table `informe_asistencia`, alimentée par l'onglet **Informe de Módulo → Asistencia** (1 ligne par directivo × module × jour, avec cases `session_am` et `session_pm`).

Le concept "Asistencia" dans le hub Satisfacciones n'est donc pas un sondage de satisfaction — c'est une présence physique. Il faut une vue dédiée.

### Approche retenue

Brancher une **vue alternative dédiée** quand `filterType === "asistencia"` dans `AdminSatisfaccionStats`, qui lit `informe_asistencia` au lieu de `satisfaccion_responses`. Les autres types (`intensivo`, `interludio`) gardent le comportement actuel.

### Indicateurs proposés (vue Asistencia)

Basés sur la structure `informe_asistencia` (cedula, module_number, dia 1-5, session_am, session_pm, razon_inasistencia) :

1. **Ficha técnica** — Module sélectionné, Région, Total directivos attendus (depuis `fichas_rlt`), Total sessions enregistrées
2. **Tasa de asistencia global** — % de sessions présentes (AM+PM cochées) sur total attendu (directivos × 5 jours × 2 sessions)
3. **Asistencia por día** — barres horizontales : Día 1 à 5 avec % présence AM et PM
4. **Asistencia por región** (si filtre = Todas) — comparaison régionale du taux de présence
5. **Razones de inasistencia** — barres horizontales : fréquence de chaque motif (Diligencias salud, MEN, etc.)
6. **Lista de directivos con baja asistencia** — table des directivos avec < 80% de présence (cedula, nom, IE, région, % présent)

### Filtres disponibles

- **Módulo** : 1 / 2 / 3 / 4 / Todos (déjà présent)
- **Región** : Todas + liste régions (déjà présent, respecte `allowedRegions` opérateur)
- (Le filtre "Tipo de encuesta" reste mais sélectionner "Asistencia" déclenche cette vue alternative)

### Détails techniques

**Fichier modifié** : `src/components/admin/AdminSatisfaccionStats.tsx`

- Ajouter un branchement en haut du composant : `if (filterType === 'asistencia') return <AsistenciaStatsView ... />`
- Créer un sous-composant `AsistenciaStatsView` (même fichier ou nouveau fichier `AdminAsistenciaStats.tsx`) qui :
  - Charge `informe_asistencia` filtré par `module_number` (et joint en mémoire avec `fichas_rlt` pour récupérer région + nom + IE par cédula, comme `AdminAsistenciaTab` le fait déjà)
  - Calcule les agrégats (% présence par jour, par région, motifs)
  - Réutilise le composant `HorizontalBarSection` existant pour cohérence visuelle

**Calcul du taux d'attendu** : nombre de directivos `fichas_rlt` avec `cargo_actual IN ('Rector/a','Coordinador/a')` et région correspondant au filtre, × 5 jours × 2 sessions.

### Récap déploiement

| Cible | Action |
|---|---|
| 🖥️ Site statique (Frontend) | ✅ Modifier `AdminSatisfaccionStats.tsx` (+ éventuellement nouveau fichier `AdminAsistenciaStats.tsx`) — redéploiement frontend |
| ⚙️ Web Service (Backend Express) | ❌ Aucune (lecture standard via dbClient sur `informe_asistencia` + `fichas_rlt`, déjà whitelistées) |
| 🗄️ Base de données (Render) | ❌ Aucune (les données existent déjà dans `informe_asistencia`) |

### Hors-scope (à confirmer si tu veux)

- Conserver ou retirer l'option `Asistencia` du filtre "Tipo de encuesta" du bloc Satisfacciones (puisqu'elle ne fait plus partie du même paradigme). Recommandation : la garder pour la continuité UX mais avec la vue dédiée.

