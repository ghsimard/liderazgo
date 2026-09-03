# Rúbricas — pourquoi José David Redondo Camargo n'a pas de valeur

## Ce que montrent les résultats de production

Module 2, cédula `6771555` (I.E. El Progreso, Oriente) :

| Ítem | directivo_nivel | equipo_nivel | acordado_nivel |
|---|---|---|---|
| Comunicación asertiva | intermedio | intermedio | **null** |
| Participación de la comunidad | intermedio | intermedio | intermedio |
| Visión compartida… | avanzado | intermedio | intermedio |

Dates de soumission du module 2 : autoevaluacion 11/06 18:26, evaluacion 11/06 19:08, **nivel_acordado 11/06 19:54**.

Ligne `51cca070-…` : `created_at` = `updated_at` = **11/06 18:26:19**.

La ligne n'a donc jamais été modifiée après sa création, alors que deux étapes ultérieures ont été soumises. Ce n'est pas un déclic tardif dans l'interface : **une écriture n'est jamais arrivée jusqu'à cette ligne**, et l'application a quand même enregistré la soumission.

## Cause dans le code

Dans `src/pages/RubricaEvaluacion.tsx` (`handleSave`, lignes ~587-644), la sauvegarde boucle sur les ítems et lance un `update` ou un `insert` par ítem — **sans jamais vérifier le résultat** :

```ts
await supabase.from("rubrica_evaluaciones").update({ ...payload, updated_by: authorCedula }).eq("id", existing.id);
```

Aucune lecture de `error`, aucun arrêt en cas d'échec. Juste après, la date de soumission est enregistrée et l'utilisateur voit « Guardado exitoso ». Si un appel échoue (coupure réseau, erreur transitoire du proxy Express, refus côté base), l'ítem reste vide et personne ne le sait. C'est exactement le scénario observé ici.

Note : `updated_at` reste égal à `created_at` malgré l'étape « evaluacion » de 19:08, ce qui suggère aussi que le trigger `update_rubrica_evaluaciones_updated_at` n'est pas actif sur la base de production. À vérifier :

```sql
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgrelid = 'rubrica_evaluaciones'::regclass AND NOT tgisinternal;
```

## Étape 1 — Fiabiliser la sauvegarde (correctif principal)

Dans `handleSave` :

- récupérer `{ error }` de chaque `update` / `insert` et interrompre la boucle au premier échec ;
- en cas d'erreur, afficher un message explicite et **ne pas** écrire la date de soumission ni afficher « Guardado exitoso » ;
- après la boucle, relire les ítems du module et vérifier que le champ de l'étape en cours est bien rempli partout ; sinon, avertir l'utilisateur que la sauvegarde est incomplète.

## Étape 2 — Corriger la donnée en production

Option recommandée : l'évaluateur rouvre la rúbrica de ce directivo et resélectionne le niveau acordado de « Comunicación asertiva ».

Option SQL, avec sauvegarde préalable :

```sql
CREATE TABLE IF NOT EXISTS _undo_rubrica_comunicacion_20260903 AS
SELECT * FROM rubrica_evaluaciones WHERE directivo_cedula = '6771555';

-- Remplacer '<nivel>' par le niveau réellement convenu
UPDATE rubrica_evaluaciones
SET acordado_nivel = '<nivel>'
WHERE id = '51cca070-a10c-442e-a605-5fb780653671'
  AND acordado_nivel IS NULL;
```

Recherche des autres cas du même type (module soumis en `nivel_acordado` mais ítem sans niveau) :

```sql
SELECT e.directivo_cedula, m.module_number, i.item_label
FROM rubrica_evaluaciones e
JOIN rubrica_items i ON i.id = e.item_id
JOIN rubrica_modules m ON m.id = i.module_id
JOIN rubrica_submission_dates d
  ON d.directivo_cedula = e.directivo_cedula
 AND d.module_number = m.module_number
 AND d.submission_type = 'nivel_acordado'
WHERE e.acordado_nivel IS NULL
ORDER BY m.module_number, e.directivo_cedula;
```

## Étape 3 — Rendre les trous visibles dans les rapports

Dans `src/components/admin/AdminRubricaRegionalReport.tsx` (bloc `moduleDistributions`, lignes ~161-238, et le tableau) :

- colonne « Sin registro » : nombre de directivos de la région, issus de `rubrica_asignaciones` dédupliquées par cédula, sans niveau acordado ni seguimiento pour l'ítem ;
- indicateur discret quand le `n` d'un ítem est inférieur au `n` maximum du module, avec la liste des directivos concernés en infobulle.

Les pourcentages restent calculés sur `n` (réponses effectives) : aucune valeur affichée ne change.

## Actions par environnement

- 🖥️ Site statique (Frontend) : republier après le correctif de sauvegarde et la colonne « Sin registro ».
- ⚙️ Web Service (Backend Express) : rien.
- 🗄️ Base de données : compléter les niveaux acordados manquants (via l'application de préférence) et vérifier le trigger `updated_at`.
