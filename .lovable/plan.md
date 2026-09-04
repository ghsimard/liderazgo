# Oriente 2026 — écart d'une école entre production et développement

## Ce que montrent les résultats
Le filtre corrigé (`c.nombre ILIKE '%oriente%'`) fonctionne : la cohorte **Oriente 2026** porte l'entité territoriale **Antioquia**, d'où le « 0 » du premier essai.

Résultats production :
- Quibdó 2026 : **25** écoles — conforme.
- Oriente 2026 : **15** écoles — développement en compte **16**.

En comparant les deux listes, l'école absente en production est :
**Institución Educativa Rural Chaparral**

Les 15 autres sont identiques dans les deux environnements.

## Vérification à faire avant toute correction
Confirmer en production, en lecture seule, si cette école existe ailleurs (référentiel, fiches, réponses) mais n'est simplement pas rattachée à la cohorte :

```sql
-- 1. Existe-t-elle dans le référentiel d'institutions ?
SELECT id, nombre, created_at FROM instituciones
WHERE nombre ILIKE '%chaparral%';

-- 2. Est-elle rattachée à une autre cohorte ?
SELECT aei.institucion_educativa, c.nombre AS cohorte, c.year
FROM ae_cohorte_instituciones aei
JOIN ae_cohortes c ON aei.cohorte_id = c.id
WHERE aei.institucion_educativa ILIKE '%chaparral%';

-- 3. A-t-elle des fiches ou des réponses ?
SELECT 'fichas' AS source, count(*) FROM fichas_rlt WHERE nombre_ie ILIKE '%chaparral%'
UNION ALL
SELECT 'ambiente', count(*) FROM encuestas_ambiente_escolar WHERE institucion_educativa ILIKE '%chaparral%'
UNION ALL
SELECT 'renombrages', count(*) FROM institucion_renames WHERE old_name ILIKE '%chaparral%' OR new_name ILIKE '%chaparral%'
UNION ALL
SELECT 'corbeille', count(*) FROM deleted_records WHERE record_label ILIKE '%chaparral%';
```

## Suite selon le résultat
- **Si l'école existe mais n'est pas rattachée à la cohorte** : un simple ajout dans `ae_cohorte_instituciones` (avec sauvegarde et undo) rétablit les 16.
- **Si l'école a été renommée** : c'est le nouveau nom qu'il faut rattacher, pas l'ancien.
- **Si elle a été supprimée** : restauration depuis la corbeille, puis rattachement.

Le script de correction sera fourni une fois le diagnostic connu, avec sauvegarde et instruction d'annulation.

## Actions techniques
- 🗄️ Base de données : requêtes de diagnostic en lecture seule ci-dessus (à exécuter en production).
- 🖥️ Site statique : aucune action.
- ⚙️ Web Service : aucune action.