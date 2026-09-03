# Rúbricas — pourquoi José David Redondo Camargo n'a pas de valeur

## Ce que montrent les résultats de production

Module 2, cédula `6771555` (I.E. El Progreso, Oriente) :

| Ítem | directivo_nivel | equipo_nivel | acordado_nivel |
|---|---|---|---|
| Comunicación asertiva | intermedio | intermedio | **null** |
| Participación de la comunidad | intermedio | intermedio | intermedio |
| Visión compartida… | avanzado | intermedio | intermedio |

Dates de soumission du module 2 : autoevaluacion 11/06 18:26, evaluacion 11/06 19:08, **nivel_acordado 11/06 19:54**.

Fait établi : la ligne existe, les trois étapes ont été soumises, et **seul le niveau acordado de cet ítem est vide**. Le rapport régional est donc correct — `n = 30` au lieu de 31 reflète fidèlement la base.

Ce qui n'est **pas** démontrable : le moment de la perte. `updated_at` est resté à `created_at`, mais la requête sur `pg_trigger` ne renvoie aucune ligne — **le trigger `update_rubrica_evaluaciones_updated_at` n'existe pas sur la base de production**, et le code n'écrit jamais `updated_at` lui-même. Cette colonne n'a donc aucune valeur d'audit ici.

## Deux causes possibles, toutes deux à corriger

**A. Écriture perdue en silence.** Dans `src/pages/RubricaEvaluacion.tsx` (`handleSave`, lignes ~587-627), la sauvegarde boucle sur les ítems et lance un `update` ou un `insert` par ítem sans jamais lire l'erreur :

```ts
await supabase.from("rubrica_evaluaciones").update({ ...payload, updated_by: authorCedula }).eq("id", existing.id);
```

Juste après, la date de soumission est écrite et l'utilisateur voit « Guardado exitoso ». Un appel échoué (réseau, proxy Express, refus base) laisse l'ítem vide sans que personne ne le sache.

**B. Désélection après coup.** Le choix du niveau acordado est un *toggle* (ligne ~1610 : recliquer sur le niveau coché remet la valeur à vide). La validation exige tous les niveaux **avant** la soumission, mais rien n'empêche de vider une case à la réouverture de la rúbrica.

## Étape 1 — Fiabiliser la sauvegarde

Dans `handleSave` :

- récupérer `{ error }` de chaque `update` / `insert` et interrompre la boucle au premier échec ;
- en cas d'erreur : message explicite, **pas** d'écriture de la date de soumission, pas de « Guardado exitoso » ;
- après la boucle, relire les ítems du module et vérifier que le champ de l'étape en cours est rempli partout ; sinon avertir que la sauvegarde est incomplète.

## Étape 2 — Empêcher la désélection après soumission

Une fois le module soumis en `nivel_acordado`, un clic sur le niveau déjà sélectionné ne le désélectionne plus. Le passage à un autre niveau reste possible selon les règles existantes.

## Étape 3 — Rétablir l'auditabilité

Ajouter en production le trigger manquant, pour que `updated_at` devienne exploitable :

```sql
CREATE TRIGGER update_rubrica_evaluaciones_updated_at
BEFORE UPDATE ON rubrica_evaluaciones
FOR EACH ROW EXECUTE FUNCTION update_rubrica_updated_at();
```

À vérifier aussi sur `rubrica_seguimientos` :

```sql
SELECT tgrelid::regclass, tgname FROM pg_trigger
WHERE tgrelid IN ('rubrica_evaluaciones'::regclass, 'rubrica_seguimientos'::regclass)
  AND NOT tgisinternal;
```

## Étape 4 — Corriger la donnée

Option recommandée : l'évaluateur rouvre la rúbrica et resélectionne le niveau acordado de « Comunicación asertiva ».

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

Recherche des autres cas identiques (module soumis en `nivel_acordado`, ítem sans niveau) :

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

## Étape 5 — Rendre les trous visibles dans les rapports

Dans `src/components/admin/AdminRubricaRegionalReport.tsx` (bloc `moduleDistributions`, lignes ~161-238, et le tableau) :

- colonne « Sin registro » : nombre de directivos de la région, issus de `rubrica_asignaciones` dédupliquées par cédula, sans niveau acordado ni seguimiento pour l'ítem ;
- indicateur discret quand le `n` d'un ítem est inférieur au `n` maximum du module, avec la liste des directivos concernés en infobulle.

Les pourcentages restent calculés sur `n` (réponses effectives) : aucune valeur affichée ne change.

## Actions par environnement

- 🖥️ Site statique (Frontend) : republier après les étapes 1, 2 et 5.
- ⚙️ Web Service (Backend Express) : rien.
- 🗄️ Base de données : créer le trigger manquant (étape 3) et compléter les niveaux acordados manquants (étape 4).
