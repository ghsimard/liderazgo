## Bug — Inicial = Evolución sur le Δ par institution

### Cause

Dans `src/components/admin/AdminAmbienteDeltaTab.tsx`, le filtre Evolución sélectionne par `campana_id` uniquement :

```ts
subsEvo = submissions.filter(s => s.campana_id === evolucion.id && s.tipo_formulario === g)
```

Or, pour les cohortes 2025, des lignes `fase = 'linea_base'` ont un `campana_id` pointant vers la campagne **cierre** (12 679 lignes `linea_base` rattachées au `campana_id` `8ab45db7…` de fase cierre). Ces lignes sont donc comptées :
- comme **Inicial** (filtre `s.fase === 'linea_base'`)
- **ET** comme **Evolución** (filtre `s.campana_id === evolucion.id`, sans vérifier la fase)

→ mêmes lignes des deux côtés → mêmes moyennes → Δ = 0.

### Correction

Ajouter `s.fase === 'cierre'` au filtre Evolución dans :
1. Le memo `analysis` (la sélection `subsEvo` par groupe).
2. Le memo `institucionDeltas` (la sélection `subsEvo` par institution).

### Effet attendu

- Les comptes Evolución revenant aux vraies réponses `fase = 'cierre'` (environ 1 324 au total au lieu de l'inflation actuelle).
- Caracas, La Salle, Mazo, etc. : Δ réel basé sur leurs vraies réponses cierre.
- Les institutions sans aucune vraie réponse `fase = 'cierre'` disparaissent du tableau (correct).
- Pas de changement sur Inicial.

### Déploiement

- 🖥️ **Site statique (Frontend)** — éditer `src/components/admin/AdminAmbienteDeltaTab.tsx` et publier.
- ⚙️ **Web Service (Backend Express)** — rien.
- 🗄️ **Base de données (Manual SQL)** — rien.
