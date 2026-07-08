## Contexte confirmé par vous

Les cohortes Medellín/Itagüí/Rionegro 2025 ont déjà des données **Evolución** → les deltas sont calculables et doivent s'afficher correctement dans Delta. Option **C** (correction locale ciblée, alignée sur Stats) est la bonne.

## Résultats d'audit

- **Campañas** (`AdminAmbienteCampanasTab.tsx`) : aucun filtre `year >= 2026`. Aucune modification nécessaire.
- **Delta** (`AdminAmbienteDeltaTab.tsx`) : le sélecteur de cohorte est OK, mais le filtre « Región » et le regroupement par région passent par `useGeographicData()` qui lit `regiones` + `region_instituciones`. La table `regiones` ne contient que « Oriente 2026 » et « Quibdó 2026 » → pour les IE 2025, le regroupement retombe sur « Sin región » et le filtre Región ne les propose pas.

## Correction proposée

### 🖥️ Site statique — `AdminAmbienteDeltaTab.tsx`

Enrichir localement `instToRegion` (et la liste des régions proposées au filtre) avec les données 2025 dérivées de `ae_cohortes` + `v_ae_instituciones_por_cohorte`, exactement comme on l'a fait dans Stats.

Étapes :

1. Ajouter en début du `useEffect` de chargement (à côté de la requête `ae_cohortes` existante ligne 82) :

```ts
supabase.from("ae_cohortes").select("id, nombre").order("nombre"),
supabase.from("v_ae_instituciones_por_cohorte").select("cohorte_id, institucion_educativa"),
```

2. Construire un `extraInstToRegion: Map<string, string>` :
   - pour chaque `(cohorte_id, institucion_educativa)` de la vue,
   - si l'IE n'est **pas** déjà présente dans `instToRegion` (issue de `useGeographicData`),
   - lui attribuer comme « région » le `nombre` de la cohorte (ex. « Medellín 2025 »).

3. Fusionner `extraInstToRegion` dans `instToRegion` (memo ligne 228-235) — l'existant garde la priorité (une IE déjà rattachée à Oriente 2026 ne bascule pas en pseudo-région 2025).

4. Étendre la liste des régions proposées au filtre :
   - la source actuelle est `regionNames` de `useGeographicData`,
   - ajouter les `nombres` de cohortes 2025 pour lesquelles au moins une IE apparaît dans `institucionDeltasView` (évite de polluer le filtre avec des régions vides).

Aucune modification à la logique de calcul de delta (ΔP ≥ 0,5 pts, memo mémoire) : elle est agnostique de la région.

### ⚙️ Web Service — aucune action

### 🗄️ Base de données — aucune action

## Note d'évolutivité (future Oriente/Quibdó Evolución)

Aucune action à prévoir : Oriente 2026 et Quibdó 2026 sont **déjà** dans `regiones` et `region_instituciones` (utilisés par `useGeographicData`). Quand leurs données Evolución arriveront, Delta les prendra en charge sans changement de code.

Le pattern « pseudo-région = nombre de cohorte » ajouté par cette correction reste utile pour toute future cohorte importée via `ae_cohorte_instituciones` sans passer par la hiérarchie géographique (comme les 2025).

## Vérification

Après la modif + Ctrl+Shift+R :
1. Delta → sélectionner « Medellín 2025 » : le tableau affiche les IE regroupées sous « Medellín 2025 » (au lieu de « Sin región »).
2. Filtre Región : « Medellín 2025 » / « Itagüí 2025 » / « Rionegro 2025 » apparaissent bien.
3. Les colonnes Δ affichent des valeurs (puisque Inicial + Evolución existent).
4. Le PDF Delta reflète le même regroupement.

## Question

Puis-je appliquer cette correction ?
