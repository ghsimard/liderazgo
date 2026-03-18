

## Plan: Unifier la visibilité Encuesta 360 pour les évaluateurs

### Problème
Les évaluateurs utilisent les flags `encuesta_entrada_visible` / `encuesta_salida_visible` de `rubrica_asignaciones` (lignes 281-298 de MiPanel.tsx), tandis que l'admin toggle la visibilité via `encuesta_360_visibility` (par région/institution). Ces deux systèmes sont déconnectés — quand l'admin active une région dans Entrada, l'évaluateur ne voit rien.

### Solution
Remplacer la logique évaluateur dans MiPanel.tsx pour utiliser `encuesta_360_visibility` au lieu des flags individuels de `rubrica_asignaciones`.

### Changement unique : `src/pages/MiPanel.tsx`

**Bloc évaluateur (lignes ~281-306)** — Remplacer la lecture des flags `encuesta_entrada_visible` / `encuesta_salida_visible` par :
1. Récupérer les institutions assignées à l'évaluateur (via `rubrica_asignaciones`)
2. Récupérer la région de ces institutions (via `get_ficha_by_cedula` d'un directivo assigné)
3. Lire `encuesta_360_visibility` et résoudre la visibilité avec la même logique hiérarchique (directivo > institution > région) que pour les directivos
4. Si **au moins une** institution assignée est visible pour une fase, afficher le bouton correspondant

Concrètement :
- Pour chaque institution assignée, vérifier si un row `scope_type=institucion` existe → sinon fallback sur `scope_type=region`
- `evalEncuestaEntradaVisible = true` si au moins une institution est visible pour fase `inicial`
- `evalEncuestaSalidaVisible = true` si au moins une institution est visible pour fase `final`

### Aucun autre fichier modifié
- `EvaluadorEncuestasView.tsx` utilise déjà `encuesta_360_visibility` correctement
- Pas de changement DB nécessaire
- Les flags `encuesta_entrada_visible` / `encuesta_salida_visible` dans `rubrica_asignaciones` deviennent obsolètes pour ce cas d'usage (mais restent en DB sans impact)

### Actions RENDER
- **Frontend** : Redéployer le build (`dist`)
- **Backend / DB** : Aucune action requise

