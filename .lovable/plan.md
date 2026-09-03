# Rúbricas — pourquoi José David Redondo Camargo n'a pas de valeur

## Ce que montrent les résultats de production

Module 2, cédula `6771555` (I.E. El Progreso, Oriente) :

| Ítem | directivo_nivel | equipo_nivel | acordado_nivel |
|---|---|---|---|
| Comunicación asertiva | intermedio | intermedio | **null** |
| Participación de la comunidad | intermedio | intermedio | intermedio |
| Visión compartida… | avanzado | intermedio | intermedio |

La ligne existe bien (`eval_id` = `51cca070-a10c-442e-…`) : ce n'est pas un enregistrement manquant. L'autoévaluation et l'évaluation d'équipe sont remplies, **seul le niveau acordado a été effacé ou jamais posé** sur cet item. C'est exactement l'écart entre `n = 30` et `n = 31` dans le rapport régional — le rapport est donc correct, c'est la donnée qui est trouée.

## Cause probable côté application

Dans `src/pages/RubricaEvaluacion.tsx`, la sélection du niveau acordado est un *toggle* : recliquer sur le niveau déjà sélectionné remet la valeur à vide (ligne ~1610, `const newValue = ev?.acordado_nivel === n.value ? "" : n.value;`). La validation avant soumission exige un acordado pour chaque item (ligne ~571), mais rien n'empêche de désélectionner **après** la soumission, lors d'une réouverture de la rúbrica. Un clic de trop suffit à vider la case sans aucun avertissement.

À confirmer avec la date de modification de la ligne :

```sql
SELECT e.created_at, e.updated_at
FROM rubrica_evaluaciones e
WHERE e.id = '51cca070-a10c-442e-a605-5fb780653...'; -- id complet

SELECT * FROM rubrica_submission_dates
WHERE directivo_cedula = '6771555' ORDER BY module_number, submitted_at;
```

Si `updated_at` est postérieur à la date de soumission `nivel_acordado` du module 2, l'hypothèse du déclic après soumission est confirmée.

## Étape 1 — Corriger la donnée

Option recommandée : l'évaluateur rouvre la rúbrica de ce directivo et resélectionne le niveau acordado de « Comunicación asertiva ». Traçable via `updated_at`.

Option SQL, avec sauvegarde préalable :

```sql
CREATE TABLE IF NOT EXISTS _undo_rubrica_comunicacion_20260903 AS
SELECT * FROM rubrica_evaluaciones WHERE directivo_cedula = '6771555';

-- Remplacer '<nivel>' par le niveau réellement convenu
UPDATE rubrica_evaluaciones e
SET acordado_nivel = '<nivel>', updated_at = now()
FROM rubrica_items i
JOIN rubrica_modules m ON m.id = i.module_id
WHERE i.id = e.item_id
  AND m.module_number = 2
  AND i.item_label ILIKE 'Comunicación asertiva%'
  AND e.directivo_cedula = '6771555'
  AND e.acordado_nivel IS NULL;
```

## Étape 2 — Empêcher que ça se reproduise

Dans `RubricaEvaluacion.tsx` : ne plus permettre de vider un niveau acordado déjà enregistré une fois le module soumis. Concrètement, si le module a une date de soumission `nivel_acordado`, un clic sur le niveau déjà sélectionné ne le désélectionne plus (le changement vers un autre niveau reste possible selon les règles existantes).

## Étape 3 — Rendre les trous visibles dans les rapports

Dans `src/components/admin/AdminRubricaRegionalReport.tsx` (bloc `moduleDistributions`, lignes ~161-238, plus le tableau) :

- colonne « Sin registro » : nombre de directivos de la région, issus de `rubrica_asignaciones` dédupliquées par cédula, sans niveau acordado ni seguimiento pour l'ítem ;
- indicateur discret quand le `n` d'un ítem est inférieur au `n` maximum du module, avec la liste des directivos concernés en infobulle.

Les pourcentages restent calculés sur `n` (réponses effectives) : aucune valeur affichée ne change.

## Actions par environnement

- 🖥️ Site statique (Frontend) : republier après le garde-fou et la colonne « Sin registro ».
- ⚙️ Web Service (Backend Express) : rien.
- 🗄️ Base de données : compléter le niveau acordado manquant (via l'application de préférence).
