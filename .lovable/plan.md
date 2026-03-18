

## Plan: Boutons Encuesta 360° pour l'évaluateur avec gestion de visibilité

### Résumé
1. L'admin contrôle la visibilité des boutons "Encuesta 360° - Entrada" et "Encuesta 360° - Salida" pour chaque évaluateur via les colonnes `encuesta_entrada_visible` / `encuesta_salida_visible` de `rubrica_asignaciones` (déjà existantes, non utilisées).
2. L'évaluateur voit ces boutons dans MiPanel si au moins une de ses assignations a le flag correspondant à `true`.
3. En cliquant sur un de ces boutons, l'évaluateur accède à une page dédiée listant ses institutions assignées avec des badges cliquables Visible/No visible pour contrôler la visibilité des directivos (via `encuesta_360_visibility`).

### Changements

**1. `src/pages/MiPanel.tsx`**
- Dans le `useEffect` pour les évaluateurs, charger les assignations (`rubrica_asignaciones`) via `rubrica_evaluadores.cedula` pour vérifier si `encuesta_entrada_visible` ou `encuesta_salida_visible` est `true` sur au moins une assignation.
- Ajouter deux états : `evalEncuestaEntradaVisible`, `evalEncuestaSalidaVisible`.
- Dans la section `selectedRole === "evaluador"`, afficher conditionnellement deux boutons :
  - "Encuestas 360° - Entrada" → `/evaluador-encuestas?fase=inicial`
  - "Encuestas 360° - Salida" → `/evaluador-encuestas?fase=final`

**2. Nouveau composant `src/components/EvaluadorEncuestasView.tsx`**
- Page complète avec paramètre `fase` (depuis query string).
- Récupère l'`evaluador_id` depuis `rubrica_evaluadores` via cédula.
- Charge les institutions distinctes depuis `rubrica_asignaciones` (filtrées par `evaluador_id`).
- Charge la visibilité depuis `encuesta_360_visibility` pour la fase donnée.
- Affiche chaque institution avec :
  - Badge cliquable Visible/No visible (toggle via upsert sur `encuesta_360_visibility` avec `scope_type="institucion"`)
  - Même logique de résolution que AdminEncuestas360Tab (institution > région > défaut)
- Bouton retour vers MiPanel.

**3. `src/App.tsx`**
- Ajouter route `/evaluador-encuestas` → `EvaluadorEncuestasView`.

**4. Admin : gestion des flags évaluateur**
- Dans le composant admin qui gère les évaluateurs/assignations (`AdminEvaluadoresTab.tsx`), ajouter des toggles pour `encuesta_entrada_visible` et `encuesta_salida_visible` par assignation (ou par évaluateur en bulk). Cela permet à l'admin de décider si l'évaluateur voit les boutons Entrada/Salida.

### Aucun changement DB requis
- Les colonnes `encuesta_entrada_visible` et `encuesta_salida_visible` existent déjà sur `rubrica_asignaciones`.
- `encuesta_360_visibility` a déjà les policies publiques INSERT/UPDATE.

### Flux
```text
Admin active encuesta_entrada_visible sur rubrica_asignaciones
  → Évaluateur voit bouton "Encuesta 360° - Entrada" dans MiPanel
    → Évaluateur entre, voit ses institutions
      → Clique badge pour toggle visibilité institution (encuesta_360_visibility)
        → Directivos de cette institution voient/perdent le bouton dans leur MiPanel
```

