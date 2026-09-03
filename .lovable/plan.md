# Rúbricas — pourquoi José David Redondo Camargo n'a pas de valeur

## Ce que montrent les résultats de production

Module 2, cédula `6771555` (I.E. El Progreso, Oriente) :

| Ítem | directivo_nivel | equipo_nivel | acordado_nivel |
|---|---|---|---|
| Comunicación asertiva | intermedio | intermedio | **null** |
| Participación de la comunidad | intermedio | intermedio | intermedio |
| Visión compartida… | avanzado | intermedio | intermedio |

La ligne existe (`eval_id` = `51cca070-a10c-442e-a605-5fb780653671`) : rien n'est manquant en base, seul le **niveau acordado de cet ítem est vide**. C'est exactement l'écart entre `n = 30` et `n = 31` : le rapport régional est correct, c'est la donnée qui est trouée.

Les dates de soumission confirment que le parcours a bien été complété pour le module 2 :

- autoevaluacion : 11/06/2026 18:26
- evaluacion : 11/06/2026 19:08
- **nivel_acordado : 11/06/2026 19:54**

Le module a donc été soumis avec ses niveaux acordados. La valeur a très probablement été effacée **après** la soumission.

## Cause probable côté application

Dans `src/pages/RubricaEvaluacion.tsx`, le choix du niveau acordado est un *toggle* : recliquer sur le niveau déjà coché remet la valeur à vide (ligne ~1610, `const newValue = ev?.acordado_nivel === n.value ? "" : n.value;`). La validation exige un acordado pour chaque ítem **avant** la soumission (ligne ~571), mais rien n'empêche de désélectionner ensuite, à la réouverture de la rúbrica. Un clic de trop vide la case sans avertissement.

Vérification restante (à exécuter seule, pgAdmin n'affiche que le dernier SELECT) :

```sql
SELECT created_at, updated_at
FROM rubrica_evaluaciones
WHERE id = '51cca070-a10c-442e-a605-5fb780653671';
```

Si `updated_at` est postérieur au 11/06/2026 19:54, l'hypothèse du déclic après soumission est confirmée.

## Étape 1 — Corriger la donnée

Option recommandée : l'évaluateur rouvre la rúbrica de ce directivo et resélectionne le niveau acordado de « Comunicación asertiva ». Traçable via `updated_at`.

Option SQL, avec sauvegarde préalable :

```sql
CREATE TABLE IF NOT EXISTS _undo_rubrica_comunicacion_20260903 AS
SELECT * FROM rubrica_evaluaciones WHERE directivo_cedula = '6771555';

-- Remplacer '<nivel>' par le niveau réellement convenu (probablement 'intermedio')
UPDATE rubrica_evaluaciones
SET acordado_nivel = '<nivel>', updated_at = now()
WHERE id = '51cca070-a10c-442e-a605-5fb780653671'
  AND acordado_nivel IS NULL;
```

## Étape 2 — Empêcher que ça se reproduise

Dans `RubricaEvaluacion.tsx` : une fois le module soumis en `nivel_acordado`, un clic sur le niveau déjà sélectionné ne le désélectionne plus. Le passage à un autre niveau reste possible selon les règles existantes (jamais en dessous du niveau acordado).

## Étape 3 — Rendre les trous visibles dans les rapports

Dans `src/components/admin/AdminRubricaRegionalReport.tsx` (bloc `moduleDistributions`, lignes ~161-238, et le tableau de rendu) :

- colonne « Sin registro » : nombre de directivos de la région, issus de `rubrica_asignaciones` dédupliquées par cédula, sans niveau acordado ni seguimiento pour l'ítem ;
- indicateur discret quand le `n` d'un ítem est inférieur au `n` maximum du module, avec la liste des directivos concernés en infobulle.

Les pourcentages restent calculés sur `n` (réponses effectives) : aucune valeur affichée ne change.

## Actions par environnement

- 🖥️ Site statique (Frontend) : republier après le garde-fou et la colonne « Sin registro ».
- ⚙️ Web Service (Backend Express) : rien.
- 🗄️ Base de données : compléter le niveau acordado manquant (via l'application de préférence).
