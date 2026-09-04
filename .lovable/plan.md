# Vérification Oriente 2026 — script SQL

## Objectif
Fournir un script SQL de vérification, adapté du script Quibdó/Oriente précédent, pour lister et compter les écoles rattachées à la cohorte **Oriente 2026** en production.

## Portée
- Lecture seulement : aucune modification de la base de données, du backend ou du frontend.
- Cible : production (le script est testable aussi en développement, mais la cohorte Oriente 2026 n’existe pas en dev).

## Livrable
Un script SQL unique à exécuter dans l’éditeur SQL de production, qui retourne :
1. Le nombre d’écoles liées à une cohorte Oriente 2026.
2. La liste détaillée de ces écoles avec leur cohorte et entité territoriale.
3. (Optionnel) Les écoles Oriente 2026 présentes dans `fichas_rlt` mais absentes des cohortes.

## Script SQL

```sql
-- ============================================================
-- VÉRIFICATION LISTE ÉCOLES ORIENTE 2026
-- ============================================================

-- 1. Nombre d'écoles liées à une cohorte Oriente 2026
SELECT 
  COUNT(*) AS total_oriente_2026
FROM ae_cohorte_instituciones aei
JOIN ae_cohortes c ON aei.cohorte_id = c.id
WHERE c.year = 2026
  AND c.entidad_territorial ILIKE '%oriente%';

-- 2. Liste détaillée des écoles Oriente 2026
SELECT 
  aei.institucion_educativa,
  c.nombre AS cohorte,
  c.entidad_territorial
FROM ae_cohorte_instituciones aei
JOIN ae_cohortes c ON aei.cohorte_id = c.id
WHERE c.year = 2026
  AND c.entidad_territorial ILIKE '%oriente%'
ORDER BY c.entidad_territorial, aei.institucion_educativa;

-- 3. Écoles Oriente 2026 présentes dans fichas_rlt mais absentes des cohortes (optionnel)
SELECT 
  f.nombre_ie,
  f.entidad_territorial,
  f.region
FROM fichas_rlt f
WHERE f.region ILIKE '%oriente%'
  AND f.numero_cedula IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM ae_cohorte_instituciones aei
    JOIN ae_cohortes c ON aei.cohorte_id = c.id
    WHERE c.year = 2026
      AND c.entidad_territorial ILIKE '%oriente%'
      AND aei.institucion_educativa = f.nombre_ie
  )
ORDER BY f.nombre_ie;
```

## Résultat attendu en production
- **17 écoles** pour Oriente 2026 (selon le référentiel établi avant l’import E360 du 3 août).

## Aucune action technique requise
Ce plan ne modifie aucun fichier du projet, aucune table et aucun service. Il s’agit uniquement d’un livrable SQL de diagnostic.