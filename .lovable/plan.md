

## Constat

| Source | Volume | État |
|---|---|---|
| `ae_docentes_submissions_2025` | 2 715 | Données Inicial déjà collectées (mai-oct 2025) |
| `ae_estudiantes_submissions_2025` | 7 201 | Données Inicial déjà collectées |
| `ae_acudientes_submissions_2025` | 8 029 | Données Inicial déjà collectées |
| `encuestas_ambiente_escolar` | 17 615 | Réponses sans `campana_id` ni `fase` |

Les **3 cohortes 2025** (Itagüí, Medellín, Rionegro) ont leurs **86 institutions** mappées dans `ae_cohorte_instituciones` et leurs réponses Inicial sont **déjà dans la BD** — mais réparties dans 2 emplacements différents :
- Tables historiques `ae_*_submissions_2025` (import RLT-Stats d'origine)
- Table unifiée `encuestas_ambiente_escolar` (probablement une migration partielle déjà faite)

## Plan d'action

### 1. Créer 3 campagnes Inicial rétroactives (SQL)

Pour Itagüí 2025, Medellín 2025, Rionegro 2025 :
- `fase = 'linea_base'` (= "Inicial" en UI)
- `fecha_inicio = 2025-05-15` (date min réelle des données)
- `fecha_fin = 2025-10-14` (date max réelle)
- `nombre = "<Cohorte> — Inicial"`

### 2. Backfill des `campana_id` + `fase` sur données existantes

Mettre à jour `encuestas_ambiente_escolar` :
- Pour chaque ligne dont `institucion_educativa` appartient à une des 3 cohortes 2025 → injecter le `campana_id` Inicial correspondant et `fase = 'linea_base'`

```sql
UPDATE encuestas_ambiente_escolar e
SET campana_id = camp.id, fase = 'linea_base'
FROM ae_cohorte_instituciones ci
JOIN ae_campanas camp ON camp.cohorte_id = ci.cohorte_id AND camp.fase = 'linea_base'
WHERE e.institucion_educativa = ci.institucion_educativa
  AND e.campana_id IS NULL;
```

### 3. Affichage Admin "Campañas"

Les 3 campagnes Inicial 2025 apparaîtront automatiquement avec :
- **Estado : Cerrada** (fecha_fin = 2025-10-14 < aujourd'hui)
- **Respuestas : nombre réel** déjà collecté (visible dans la colonne "Respuestas")
- **Suppression bloquée** (réponses associées)

L'admin n'aura qu'à créer les **campagnes Evolución 2026** quand il sera prêt à relancer la collecte.

### 4. Onglet Delta — comparaison fonctionnelle dès le départ

Une fois les Evolución créées, le sous-onglet "Análisis por Campaña" pourra immédiatement comparer Inicial 2025 (déjà chargée) vs Evolución (à venir) pour les 3 cohortes.

### 5. Mise à jour RENDER (manuel SQL)

Sur Render, il faudra exécuter en plus du SQL de création de table déjà fourni :

```sql
-- Insérer les 3 campagnes Inicial rétroactives
INSERT INTO ae_campanas (cohorte_id, fase, fecha_inicio, fecha_fin, nombre)
SELECT id, 'linea_base', '2025-05-15', '2025-10-14', nombre || ' — Inicial'
FROM ae_cohortes
WHERE nombre IN ('Itagüí 2025', 'Medellín 2025', 'Rionegro 2025')
ON CONFLICT (cohorte_id, fase) DO NOTHING;

-- Backfill (si la table encuestas_ambiente_escolar contient déjà des données sur Render)
UPDATE encuestas_ambiente_escolar e
SET campana_id = camp.id, fase = 'linea_base'
FROM ae_cohorte_instituciones ci
JOIN ae_campanas camp ON camp.cohorte_id = ci.cohorte_id AND camp.fase = 'linea_base'
WHERE e.institucion_educativa = ci.institucion_educativa
  AND e.campana_id IS NULL;
```

## Actions de déploiement

- 🗄️ **Base de données (Lovable Cloud)** : 1 migration → INSERT campagnes + UPDATE backfill (auto-appliqué)
- 🗄️ **Base de données (Render)** : SQL manuel ci-dessus à exécuter après la migration de structure
- 🖥️ **Site statique (Frontend)** : aucun changement de code requis — l'onglet Campañas affichera automatiquement les 3 entrées
- ⚙️ **Web Service (Backend Express)** : aucun changement

## À confirmer

1. Les **dates rétroactives** Inicial 2025 (2025-05-15 → 2025-10-14, dérivées des données réelles) — OK ou tu préfères d'autres bornes ?
2. Les tables historiques `ae_docentes_submissions_2025` / `ae_estudiantes_submissions_2025` / `ae_acudientes_submissions_2025` — on les laisse intactes (consultables dans l'onglet "Línea Base 2025") ou on les considère comme legacy à terme ?

