# Satisfacción Intensivo 3 — Quibdó 2026 : les valeurs de Logística ont été écrasées

## Ce que montrent les deux rapports

| Bloc | Rapport envoyé (version d'origine) | Rapport actuel |
|---|---|---|
| Logística — convocatoria / agenda / puntualidad / espacios | 75 % | 100 % |
| Logística — alimentación / materiales | 70 % | 100 % |
| Logística (bloc) | 73,33 % | 100 % |
| Satisfaction générale | 90,78 % | 99,67 % |

Les autres blocs (Desarrollo, Equipo facilitador, Autoevaluación, Actividades) sont identiques. Seul le bloc Logística a bougé.

## Cause

Le 29 août, à ta demande, j'ai préparé une correction pour deux modules où des participants avaient, disait-on, coché « Totalmente en desacuerdo » par erreur. Le script `2026-08-29_satisfaccion_logistica_1_a_4.sql` transforme **toutes** les réponses « Totalmente en desacuerdo » du bloc Logística en « Totalmente de acuerdo », pour **tous les participants de tous les modules 3 et 4 et de toutes les régions** — donc aussi pour Quibdó, où ces réponses négatives étaient bien réelles (les commentaires libres se plaignent d'ailleurs des repas).

C'est ce qui fait passer Logística de 73,33 % à 100 % et le total de 90,78 % à 99,67 %.

La base de développement ne contient aucune réponse Intensivo : l'écart n'existe qu'en production, ce qui explique que les deux environnements ne montrent pas la même chose.

## Hypothèse alternative à écarter d'abord : un recteur retardataire

Il se peut aussi qu'un recteur ait répondu **après** l'envoi du premier rapport. Le rapport d'origine annonce 20 réponses ; il faut donc vérifier s'il y en a toujours 20 aujourd'hui et à quelles dates elles ont été enregistrées.

Requêtes de vérification (lecture seule, à exécuter en production) :

```sql
-- A. Nombre de réponses et dates, Quibdó module 3
SELECT count(*) AS total,
       min(created_at) AS premiere,
       max(created_at) AS derniere
FROM satisfaccion_responses
WHERE form_type = 'intensivo' AND module_number = 3
  AND region ILIKE '%quibd%';

-- B. Détail par réponse : qui, quand, et valeurs Logística actuelles
SELECT r.cedula, r.created_at, r.respuestas->'logistica' AS logistica_actuelle,
       (b.id IS NOT NULL) AS modifiee_le_29_aout
FROM satisfaccion_responses r
LEFT JOIN _undo_satisfaccion_logistica_20260829 b ON b.id = r.id
WHERE r.form_type = 'intensivo' AND r.module_number = 3
  AND r.region ILIKE '%quibd%'
ORDER BY r.created_at;

-- C. Valeurs d'origine des réponses modifiées
SELECT r.cedula, r.created_at, b.respuestas_original->'logistica' AS logistica_origine
FROM _undo_satisfaccion_logistica_20260829 b
JOIN satisfaccion_responses r ON r.id = b.id
WHERE r.form_type = 'intensivo' AND r.module_number = 3
  AND r.region ILIKE '%quibd%'
ORDER BY r.created_at;
```

Lecture des résultats :
- Si **20 réponses** et plusieurs lignes marquées « modifiée le 29 août » → c'est bien le script du 29 août qui a écrasé les valeurs.
- Si **21 réponses ou plus**, avec une créée après la date du rapport → une partie de l'écart vient d'une réponse tardive, et il faudra faire la part des deux causes.
- La requête C montre exactement quelles réponses négatives ont disparu et pour quel recteur.


## Bonne nouvelle : c'est réversible

Le script avait créé une sauvegarde avant toute modification : `_undo_satisfaccion_logistica_20260829`. Les valeurs d'origine y sont intactes.

## Ce que je propose

### Étape 1 — Constater l'ampleur (lecture seule)
Compter, par région et par module, combien de réponses ont été modifiées et lesquelles.

### Étape 2 — Tout restaurer
Remettre les valeurs d'origine pour toutes les réponses sauvegardées. On revient exactement à l'état du rapport envoyé (90,78 % pour Quibdó 3).

### Étape 3 — Corriger uniquement les vrais cas d'erreur
S'il y a réellement eu des participants qui se sont trompés, il faut me dire **qui** (région, module, cédula). La correction sera alors appliquée à ces personnes-là seulement, avec sa propre sauvegarde.

Si on ne peut pas identifier ces personnes avec certitude, la position la plus sûre est de ne rien recorriger et de garder les réponses telles que soumises.

### Étape 4 — Regénérer le rapport
Une fois la base restaurée, le rapport en ligne et le PDF de Quibdó 3 retrouveront automatiquement les valeurs d'origine. Les PDF déjà téléchargés doivent être régénérés.

## Actions par service

- 🗄️ Base de données (SQL manuel en production) : le script de vérification, puis le script de restauration. Je les fournis prêts à copier.
- ⚙️ Web Service (Backend Express) : aucune action.
- 🖥️ Site statique (Frontend) : aucune action — aucun changement de code n'est nécessaire, le rapport lit la base en direct.

## Point à trancher avant que je génère le script

Restaure-t-on **toutes** les régions et modules touchés, ou seulement Quibdó module 3 ?