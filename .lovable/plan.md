## Objectif

Revenir à l'état antérieur : **un directivo peut de nouveau être évalué par plusieurs évaluateurs** (la règle 1-à-1 ajoutée récemment est supprimée).

## Actions à réaliser

### 🗄️ Base de données (SQL manuel sur Render)

Supprimer la contrainte d'unicité sur `directivo_cedula`.

```sql
ALTER TABLE public.rubrica_asignaciones
  DROP CONSTRAINT IF EXISTS rubrica_asignaciones_directivo_unique;
```

Les colonnes d'audit (`evaluador_cedula`, `updated_by`, etc.) ajoutées en même temps **restent en place** — elles ne gênent rien et continuent d'alimenter le suivi « Última edición ».

La contrainte historique `UNIQUE (evaluador_id, directivo_cedula)` reste, elle : elle empêche seulement qu'un **même évaluateur** soit assigné deux fois au même directivo (comportement d'origine).

### 🖥️ Site statique (Frontend)

**`src/components/admin/AdminEvaluadoresTab.tsx`** — retirer le message spécifique à la violation d'unicité 1-à-1 dans `handleAssign` (autour des lignes 160-176), puisqu'il ne se déclenchera plus. On garde un simple toast d'erreur générique. Aucun autre changement fonctionnel nécessaire :
- `TransferDirectivosDialog` reste utile mais optionnel (les admins peuvent aussi simplement créer une seconde assignation).
- `MiPanel.tsx` et `RubricaEvaluacion.tsx` supportent déjà plusieurs assignations (`.some(...)` pour la visibilité, dernière évaluation affichée via colonnes d'audit).

### ⚙️ Web Service (Backend Express)

Aucune modification. Les routes proxy PostgREST ne référencent pas la contrainte.

## Résultat attendu

- Un admin peut assigner un même directivo à plusieurs évaluateurs (comme avant).
- Les colonnes d'audit continuent d'enregistrer qui a fait la dernière évaluation.
- Aucune donnée existante n'est perdue.
