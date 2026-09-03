# Rúbricas — rapport régional : n = 30 au lieu de 31

## Constat

Le graphique et le tableau proviennent du rapport régional des rúbricas (`AdminRubricaRegionalReport`). La colonne `n` de chaque item se calcule ainsi :

- on prend les lignes de `rubrica_evaluaciones` de l'item qui ont un `acordado_nivel` non nul ;
- on ajoute les directivos qui ont seulement un `rubrica_seguimientos` pour cet item.

Autrement dit, `n` ne compte pas les directivos assignés, mais les enregistrements avec un niveau acordado. Un `n` de 30 contre 31 pour les deux autres items du module 2 signifie, presque certainement, qu'**un directivo n'a pas de niveau acordado enregistré pour « Comunicación asertiva »** (cellule vide / valeur nulle), même s'il en a un pour les autres items.

Je ne peux pas le confirmer d'ici : la base de données de l'environnement de développement ne contient pas d'évaluations de rúbrica, donc le diagnostic doit être vérifié avec une requête en production avant de toucher à quoi que ce soit.

## Étape 1 — Vérification en production (SQL en lecture seule)

Identifier le directivo manquant pour cet item :

```sql
-- Directivos avec acordado dans le module 2 mais sans acordado pour "Comunicación asertiva"
WITH mod2 AS (
  SELECT i.id, i.item_label
  FROM rubrica_items i
  JOIN rubrica_modules m ON m.id = i.module_id
  WHERE m.module_number = 2
),
con_acordado AS (
  SELECT DISTINCT e.directivo_cedula
  FROM rubrica_evaluaciones e
  JOIN mod2 i ON i.id = e.item_id
  WHERE e.acordado_nivel IS NOT NULL
)
SELECT c.directivo_cedula,
       f.nombres_apellidos,
       f.nombre_ie,
       f.region,
       (SELECT e2.acordado_nivel
          FROM rubrica_evaluaciones e2
          JOIN mod2 i2 ON i2.id = e2.item_id
         WHERE e2.directivo_cedula = c.directivo_cedula
           AND i2.item_label ILIKE 'Comunicación asertiva%') AS nivel_comunicacion
FROM con_acordado c
LEFT JOIN fichas_rlt f ON f.numero_cedula = c.directivo_cedula
ORDER BY nivel_comunicacion NULLS FIRST, f.nombres_apellidos;
```

Et vérifier s'il y a des lignes dupliquées (même directivo, même item), ce qui fausserait aussi le comptage :

```sql
SELECT e.item_id, e.directivo_cedula, count(*)
FROM rubrica_evaluaciones e
JOIN rubrica_items i ON i.id = e.item_id
JOIN rubrica_modules m ON m.id = i.module_id
WHERE m.module_number = 2 AND e.acordado_nivel IS NOT NULL
GROUP BY 1, 2 HAVING count(*) > 1;
```

## Étape 2 — Correction selon le résultat

- **Cas A (le plus probable) : il manque le niveau acordado d'un directivo.** Ce n'est pas une erreur de calcul : le rapport est correct. L'évaluateur doit compléter cet item dans la rúbrica du directivo identifié, ou on corrige avec un `UPDATE` ponctuel si le niveau acordado réel est connu.
- **Cas B : il y a des lignes dupliquées.** On ajuste le calcul pour compter les directivos uniques au lieu des lignes.

## Amélioration de l'interface (indépendante du cas)

Pour que ce type de différence soit visible sans consulter la base de données, ajouter dans le tableau du rapport régional :

- une colonne « Sans enregistrement » avec le nombre de directivos de la région qui n'ont pas de niveau acordado ni de seguimiento pour cet item ;
- un avertissement visuel quand le `n` d'un item est inférieur au `n` maximum du module, avec la liste des directivos absents dans une infobulle.

## Détails techniques

- Fichier concerné : `src/components/admin/AdminRubricaRegionalReport.tsx` (bloc `moduleDistributions`, lignes ~161-238).
- L'univers de référence serait les `rubrica_asignaciones` de la région (dédupliquées par cédula), comparées aux cédulas qui ont un `acordado_nivel` ou un seguimiento.
- Les pourcentages continueraient à se calculer sur `n` (réponses effectives), sans changer les valeurs actuelles.

## Actions par environnement

- 🖥️ Site statique (Frontend) : republier après l'amélioration de l'interface.
- ⚙️ Web Service (Backend Express) : rien.
- 🗄️ Base de données : exécuter en production les requêtes de vérification ; puis, si applicable, l'`UPDATE` ponctuel du niveau manquant.
