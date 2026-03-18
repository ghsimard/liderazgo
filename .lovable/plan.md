

## Plan : Indicateur de visibilité dans le moniteur Encuesta 360 Entrada/Salida

### Objectif

Quand un admin change la visibilité d'une institution (ou région/directivo) dans l'onglet Visibilidad, le moniteur "Estado de recolección" (AdminEncuestaMonitor) doit montrer visuellement quels directivos n'ont **pas** accès à l'encuesta (bouton masqué dans leur MiPanel).

### Approche

Modifier `AdminEncuestaMonitor.tsx` pour :

1. **Charger les données de visibilité** : récupérer toutes les lignes de `encuesta_360_visibility` au chargement.
2. **Charger la région et l'institution de chaque directivo** : déjà disponible via `fichas_rlt` (champs `region` et `nombre_ie`).
3. **Résoudre la visibilité par directivo** : appliquer la même logique de cascade (directivo > institution > région) utilisée dans `MiPanel.tsx`.
4. **Afficher un indicateur visuel** : ajouter une colonne ou un badge/icône (ex: `EyeOff` barré en rouge) sur chaque ligne de directivo dont la visibilité est désactivée, avec un tooltip expliquant "No visible para este directivo".
5. **Filtre supplémentaire** : ajouter une option de filtre "No visible" pour voir rapidement les directivos qui n'ont pas accès.

### Fichiers modifiés

- `src/components/admin/AdminEncuestaMonitor.tsx` — ajouter la colonne visibilité et la logique de résolution

### Détails techniques

- Réutiliser exactement la fonction `resolveVisibility(fase, cedula, ie, region, visRows)` pour cohérence avec MiPanel.
- Ajouter `numero_cedula` au SELECT sur `fichas_rlt` (nécessaire pour résoudre les overrides directivo).
- Nouvelle colonne "Visible" avec icône `Eye`/`EyeOff` colorée.
- Option de filtre : "all" | "incomplete" | "complete" | "no_visible".

