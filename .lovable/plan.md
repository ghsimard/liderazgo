## Suppression de « Institución Educativa Rural Chaparral »

### Constat (vérifié en prod)
Après scan de toutes les tables contenant un nom d'institution, cette IE n'existe qu'à **un seul endroit** :

| Table | Occurrences |
|---|---|
| `ae_cohorte_instituciones` | **1** |
| `fichas_rlt` | 0 |
| `ae_acudientes_submissions_2025` | 0 |
| `ae_docentes_submissions_2025` | 0 |
| `ae_estudiantes_submissions_2025` | 0 |
| `ae_rectores_2025` | 0 |
| `encuestas_360` | 0 |
| `encuestas_ambiente_escolar` | 0 |
| `encuesta_invitaciones` | 0 |
| `operator_permissions` | 0 |
| `rubrica_asignaciones` | 0 |

Aucune donnée opérationnelle (encuestas, fichas, rúbricas, invitations, permissions) n'est rattachée à cette IE. La suppression est **sans effet de bord**.

### Action

🗄️ **Base de données (SQL manuel via pgAdmin4 sur Render)** — une seule requête :

```sql
BEGIN;

-- Vérification avant
SELECT c.nombre AS cohorte, ci.institucion_educativa
FROM ae_cohorte_instituciones ci
JOIN ae_cohortes c ON c.id = ci.cohorte_id
WHERE ci.institucion_educativa ILIKE '%Chaparral%';

-- Suppression
DELETE FROM ae_cohorte_instituciones
WHERE institucion_educativa ILIKE '%Chaparral%';

-- Vérification après (doit retourner 0 lignes)
SELECT count(*) FROM ae_cohorte_instituciones
WHERE institucion_educativa ILIKE '%Chaparral%';

-- Vérification vue unifiée (doit aussi retourner 0)
SELECT count(*) FROM v_ae_instituciones_por_cohorte
WHERE institucion_educativa ILIKE '%Chaparral%';

COMMIT;
```

Exécuter le bloc, contrôler que les deux `count(*)` finaux valent **0**, puis `COMMIT`. En cas de doute, `ROLLBACK`.

🖥️ **Frontend** : rien à faire.
⚙️ **Backend Express** : rien à faire.

### Notes
- La vue `v_ae_instituciones_por_cohorte` étant dérivée de `ae_cohorte_instituciones` (branche legacy) + `fichas_rlt`, elle se met à jour automatiquement dès que la ligne est supprimée.
- Si un jour cette IE réapparaît via une ficha RLT, il faudra plutôt supprimer la ficha correspondante.
