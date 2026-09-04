# Vérification Oriente 2026 — script SQL corrigé

## Cause du résultat « 0 »
La cohorte **Oriente 2026** n'a pas « Oriente » comme entité territoriale : son entité territoriale est **Antioquia**, et « Oriente » n'apparaît que dans le **nom** de la cohorte. Le filtre `entidad_territorial ILIKE '%oriente%'` ne trouve donc rien.

Vérifié en développement :
- Cohortes 2026 : `Oriente 2026` (entité : Antioquia) et `Quibdó 2026` (entité : Quibdó).
- Écoles liées : Oriente 2026 → **16**, Quibdó 2026 → **25**.

Le bon filtre est sur `c.nombre`.

## Script SQL à exécuter en production (lecture seule)

```sql
-- ============================================================
-- VÉRIFICATION LISTE ÉCOLES ORIENTE 2026
-- ============================================================

-- 0. Voir toutes les cohortes (pour confirmer les noms exacts)
SELECT id, nombre, entidad_territorial, year, is_baseline
FROM ae_cohortes
ORDER BY year, nombre;

-- 1. Nombre d'écoles par cohorte 2026
SELECT c.nombre AS cohorte, COUNT(*) AS total_escuelas
FROM ae_cohorte_instituciones aei
JOIN ae_cohortes c ON aei.cohorte_id = c.id
WHERE c.year = 2026
GROUP BY c.nombre
ORDER BY c.nombre;

-- 2. Liste détaillée Oriente 2026
SELECT
  aei.institucion_educativa,
  c.nombre AS cohorte,
  c.entidad_territorial
FROM ae_cohorte_instituciones aei
JOIN ae_cohortes c ON aei.cohorte_id = c.id
WHERE c.year = 2026
  AND c.nombre ILIKE '%oriente%'
ORDER BY aei.institucion_educativa;

-- 3. Liste détaillée Quibdó 2026 (comparaison)
SELECT
  aei.institucion_educativa,
  c.nombre AS cohorte,
  c.entidad_territorial
FROM ae_cohorte_instituciones aei
JOIN ae_cohortes c ON aei.cohorte_id = c.id
WHERE c.year = 2026
  AND c.nombre ILIKE '%quibdó%'
ORDER BY aei.institucion_educativa;
```

## Résultat attendu
- Oriente 2026 : **16** écoles rattachées à la cohorte (la 17e école de la région, ajoutée en février, n'est pas nécessairement rattachée à la cohorte Ambiente Escolar).
- Quibdó 2026 : **25** écoles.

## Actions techniques
Aucune. Script de diagnostic en lecture seule : aucun changement de code, de backend ni de base de données.