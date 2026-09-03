# Rúbricas — pourquoi José David Redondo Camargo n'a pas de valeur

## Constat confirmé

Au module 2, 56 directivos ont un niveau acordado. Un seul a `nivel_comunicacion` à `[null]` :
**José David Redondo Camargo** — cédula `6771555` — I.E. El Progreso — Oriente. C'est exactement l'écart entre `n = 30` et `n = 31`.

Le rapport régional est donc correct : c'est la donnée source qui est incomplète. Reste à établir *pourquoi*.

## Étape 1 — Diagnostic ciblé en production (lecture seule)

Trois hypothèses à départager en une requête :

1. la ligne existe mais `acordado_nivel` est nul (l'item a été laissé vide au moment de l'accord) ;
2. aucune ligne n'existe pour ce couple directivo/item (l'item n'a jamais été ouvert) ;
3. la ligne existe avec un `acordado_nivel` vide (`''`) plutôt que nul.

```sql
-- État complet du module 2 pour ce directivo
SELECT i.sort_order,
       i.item_label,
       e.id AS eval_id,
       e.directivo_nivel,
       e.equipo_nivel,
       e.acordado_nivel,
       e.created_at,
       e.updated_at
FROM rubrica_items i
JOIN rubrica_modules m ON m.id = i.module_id
LEFT JOIN rubrica_evaluaciones e
       ON e.item_id = i.id AND e.directivo_cedula = '6771555'
WHERE m.module_number = 2
ORDER BY i.sort_order;
```

Compléments utiles :

```sql
-- Y a-t-il un seguimiento pour cet item ?
SELECT s.* FROM rubrica_seguimientos s
JOIN rubrica_items i ON i.id = s.item_id
JOIN rubrica_modules m ON m.id = i.module_id
WHERE m.module_number = 2 AND s.directivo_cedula = '6771555';

-- Le module a-t-il été soumis (nivel_acordado) ?
SELECT * FROM rubrica_submission_dates
WHERE directivo_cedula = '6771555' ORDER BY module_number, submitted_at;

-- Assignation et évaluateur
SELECT a.*, ev.nombre AS evaluador
FROM rubrica_asignaciones a
LEFT JOIN rubrica_evaluadores ev ON ev.id = a.evaluador_id
WHERE a.directivo_cedula = '6771555';
```

## Étape 2 — Correction selon le résultat

- **Ligne présente, `acordado_nivel` nul** → l'évaluateur ouvre la rúbrica du directivo et complète l'item « Comunicación asertiva ». Correction propre, tracée par `updated_at`.
- **Aucune ligne** → même geste dans l'application (l'enregistrement se crée à la sauvegarde). Un `INSERT` manuel n'est nécessaire que si l'accès applicatif est bloqué.
- **Chaîne vide** → normaliser en base :

```sql
UPDATE rubrica_evaluaciones
SET acordado_nivel = NULL
WHERE acordado_nivel = '';
```

Si un `UPDATE` manuel du niveau est retenu, sauvegarder d'abord :

```sql
CREATE TABLE IF NOT EXISTS _undo_rubrica_comunicacion_20260903 AS
SELECT e.* FROM rubrica_evaluaciones e
JOIN rubrica_items i ON i.id = e.item_id
JOIN rubrica_modules m ON m.id = i.module_id
WHERE m.module_number = 2
  AND i.item_label ILIKE 'Comunicación asertiva%'
  AND e.directivo_cedula = '6771555';
```

## Étape 3 — Rendre ces trous visibles dans l'interface

Pour ne plus avoir à passer par SQL :

- colonne « Sin registro » dans le tableau du rapport régional : nombre de directivos de la région sans niveau acordado ni seguimiento pour l'item ;
- indicateur discret quand le `n` d'un item est inférieur au `n` maximum du module, avec la liste des directivos manquants en infobulle.

## Détails techniques

- Fichier concerné : `src/components/admin/AdminRubricaRegionalReport.tsx`, bloc `moduleDistributions` (lignes ~161-238) et le tableau de rendu.
- Charger `rubrica_asignaciones` (cédula, nom) pour disposer de l'univers de référence par région.
- Les pourcentages restent calculés sur `n` (réponses effectives) : aucune valeur affichée ne change.

## Actions par environnement

- 🖥️ Site statique (Frontend) : republier après l'ajout de la colonne « Sin registro ».
- ⚙️ Web Service (Backend Express) : rien.
- 🗄️ Base de données : exécuter les requêtes de diagnostic, puis compléter le niveau manquant (de préférence via l'application).
