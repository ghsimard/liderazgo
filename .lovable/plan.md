# Rúbricas — rapport régional : n = 30 au lieu de 31

## Constat (confirmé en production)

La requête exécutée en production montre 56 directivos avec un niveau acordado au module 2, et **un seul avec `nivel_comunicacion` à `[null]`** :

- **José David Redondo Camargo** — cédula `6771555` — Institución Educativa El Progreso — région Oriente.

C'est bien la cause du `n = 30` pour « Comunicación asertiva » alors que les deux autres items du module 2 affichent 31 : ce directivo a un niveau acordado pour les autres items, mais pas pour celui-là.

Rappel du calcul dans `AdminRubricaRegionalReport` : `n` compte les lignes de `rubrica_evaluaciones` avec `acordado_nivel` non nul, plus les directivos ayant seulement un `rubrica_seguimientos`. Le rapport est donc exact — c'est la donnée qui est incomplète.

## Étape 1 — Corriger la donnée en production

Deux options, au choix :

- **Option A (recommandée)** : l'évaluateur (ou un admin via Rúbricas) complète le niveau acordado de « Comunicación asertiva » pour ce directivo dans l'application. Traçabilité conservée.
- **Option B** : `UPDATE` ponctuel en base, une fois le niveau réel connu :

```sql
-- Sauvegarde préalable
CREATE TABLE IF NOT EXISTS _undo_rubrica_comunicacion_20260903 AS
SELECT e.* FROM rubrica_evaluaciones e
JOIN rubrica_items i ON i.id = e.item_id
JOIN rubrica_modules m ON m.id = i.module_id
WHERE m.module_number = 2
  AND i.item_label ILIKE 'Comunicación asertiva%'
  AND e.directivo_cedula = '6771555';

-- Remplacer '<nivel>' par : avanzado | intermedio | basico | sin_evidencia
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

Si aucune ligne n'existe pour ce couple (directivo, item), il faut un `INSERT` plutôt qu'un `UPDATE` — à vérifier avec :

```sql
SELECT e.id, e.acordado_nivel
FROM rubrica_evaluaciones e
JOIN rubrica_items i ON i.id = e.item_id
JOIN rubrica_modules m ON m.id = i.module_id
WHERE m.module_number = 2
  AND i.item_label ILIKE 'Comunicación asertiva%'
  AND e.directivo_cedula = '6771555';
```

## Étape 2 — Rendre ces trous visibles dans l'interface

Pour éviter de devoir passer par SQL la prochaine fois, ajouter au tableau du rapport régional :

- une colonne « Sin registro » : nombre de directivos de la région (issus de `rubrica_asignaciones`, dédupliqués par cédula) sans niveau acordado ni seguimiento pour cet item ;
- un indicateur visuel discret quand le `n` d'un item est inférieur au `n` maximum du module, avec la liste des directivos manquants dans une infobulle.

## Détails techniques

- Fichier concerné : `src/components/admin/AdminRubricaRegionalReport.tsx`, bloc `moduleDistributions` (lignes ~161-238) et le tableau de rendu.
- Il faut charger `rubrica_asignaciones` (cédula, nom) pour disposer de l'univers de référence par région.
- Les pourcentages continuent d'être calculés sur `n` (réponses effectives) : aucune valeur affichée ne change.

## Actions par environnement

- 🖥️ Site statique (Frontend) : republier après l'ajout de la colonne « Sin registro ».
- ⚙️ Web Service (Backend Express) : rien.
- 🗄️ Base de données : compléter le niveau acordado manquant (via l'application ou le SQL ci-dessus).
