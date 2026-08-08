# Consolidado por cohorte (en línea) — compteur d'institutions

## Pourquoi 18 et non 25

Dans le bloc « Consolidado por cohorte (en línea) », le compteur affiché est calculé à partir des **réponses reçues** : il compte les institutions distinctes présentes dans les soumissions de la cohorte (`encuestas_ambiente_escolar`), pas les institutions **rattachées** à la cohorte.

Résultat : 18 = écoles ayant au moins une réponse. Les écoles de la cohorte sans aucune réponse ne sont pas comptées, d'où l'écart avec les 25 de la cohorte.

## Ce qu'on change

Dans le bloc consolidé en ligne :

- Afficher les deux chiffres : `18 / 25 instituciones con respuestas`, avec le total = institutions rattachées à la cohorte (vue institutions par cohorte + fichas).
- Ajouter un court lien/détail repliable « Ver instituciones sin respuestas » listant les écoles de la cohorte sans aucune réponse, pour identifier immédiatement les manquantes.
- Même traitement de libellé pour l'en-tête du rapport consolidé afin d'éviter toute ambiguïté future.

Aucun changement des calculs statistiques : les graphiques et tableaux restent basés sur les réponses réelles.

## Détails techniques

- Fichier unique : `src/components/admin/AdminAmbienteStatsTab.tsx`.
- Le total par cohorte est déjà disponible côté client via `cohorteInst` (chargé depuis `v_ae_instituciones_por_cohorte`) et l'index `ieIndex` ; aucun nouvel appel réseau.
- Le compteur actuel (ligne ~954) passe de « distinct des soumissions » à « avec réponses / total cohorte ».

## Actions requises après approbation

- 🖥️ **Site statique (Frontend)** : republier (changement 100 % client).
- ⚙️ **Web Service (Backend Express)** : rien.
- 🗄️ **Base de données** : rien.
