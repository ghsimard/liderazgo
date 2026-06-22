## Option B — Correction frontend de l'onglet Δ Delta (Ambiente Escolar)

### Modifications dans `src/components/admin/AdminAmbienteDeltaTab.tsx`

1. **Interface `Submission`** : ajouter le champ `fase: string`.
2. **Requête `encuestas_ambiente_escolar`** :
   - Ajouter `fase` à la liste `select(...)`.
   - Retirer le filtre `.not("campana_id", "is", null)` (les Inicial orphelines doivent être incluses).
3. **`institucionesConEvolucion`** : inchangé (basé sur la campagne `cierre`).
4. **`analysis`** (memo principal) — pour chaque groupe :
   - `subsIni = submissions.filter(s => s.fase === 'linea_base' && s.tipo_formulario === g && institucionesConEvolucion.has(s.institucion_educativa))`
   - `subsEvo` : inchangé (`campana_id === evolucion.id`).
5. **`institucionDeltas`** (memo per-institution) : appliquer la même logique — `subsIni` filtré par `fase === 'linea_base'` + institution, sans contrainte de `campana_id`.
6. **Indicateur d'état** : remplacer `analysis.inicial ? "✓ Inicial" : "— Inicial"` par un test basé sur la présence effective de réponses Inicial (`countIni > 0` cumulé).
7. **`handleDownloadPdf`** : `fechaInicial` n'est plus dérivé de la campagne `linea_base` (qui peut ne pas exister). Le passer à `null` ou utiliser la `fecha_inicio` de la première réponse Inicial si on veut l'afficher.

### Comportement attendu

- Les 3 cohortes 2025 (Rionegro, Itagüí, Medellín) affichent enfin leur Inicial (réponses `linea_base` filtrées aux institutions qui ont aussi de l'Evolución).
- Le Δ Global, les Δ par section, et le tableau Δ par institution se calculent correctement.
- Aucune migration ni modification de données nécessaire.

### Déploiement

- 🖥️ **Site statique (Frontend)** — éditer `src/components/admin/AdminAmbienteDeltaTab.tsx` et publier.
- ⚙️ **Web Service (Backend Express)** — rien.
- 🗄️ **Base de données (Manual SQL)** — rien.
