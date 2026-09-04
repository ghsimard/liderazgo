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

## Vérification faite : hypothèse du recteur retardataire écartée

- 20 réponses aujourd'hui, comme dans le rapport envoyé. Aucune réponse tardive n'explique l'écart.
- **7 réponses sur 20** ont été modifiées le 29 août.

Valeurs d'origine des 7 réponses modifiées (Quibdó, module 3) :

| Cédula | Réponses Logística d'origine | Lecture |
|---|---|---|
| 26271555 | tout à 1 | profil « tout en désaccord » |
| 11799114 | tout à 1 | profil « tout en désaccord » |
| 11793962 | tout à 1 | profil « tout en désaccord » |
| 11790040 | tout à 1 | profil « tout en désaccord » |
| 82382055 | tout à 1 | profil « tout en désaccord » |
| 54252226 | tout à 4 sauf alimentación = 1 | réponse manifestement réfléchie |
| 11796714 | 4, 4, 1, 3, 3, 4 | réponse manifestement réfléchie |

Conclusion : le script du 29 août a effacé aussi bien les éventuelles erreurs de lecture d'échelle (les 5 « tout à 1 ») que **deux réponses clairement volontaires et nuancées**, qui n'auraient jamais dû être touchées. C'est bien lui la cause de l'écart, à 100 %.

## Bonne nouvelle : c'est réversible

La sauvegarde `_undo_satisfaccion_logistica_20260829` contient les valeurs d'origine intactes.

## Ce que je propose

### Étape 1 — Tout restaurer
Remettre les valeurs d'origine pour **toutes** les réponses sauvegardées (toutes régions, modules 3 et 4). Quibdó 3 retrouve alors 73,33 % pour Logística et 90,78 % au total, exactement comme le rapport envoyé.

### Étape 2 — Décider du sort des 5 « tout à 1 »
Trois options, à trancher :

1. **Ne rien recorriger** — on garde les réponses telles que soumises. C'est la position la plus défendable pour l'intégrité des données.
2. **Recorriger uniquement les 5 profils « tout à 1 »** (26271555, 11799114, 11793962, 11790040, 82382055), si tu as la confirmation que ces personnes se sont bien trompées d'échelle. Les deux réponses nuancées resteront intactes.
3. **Recorriger une liste précise de cédulas** que tu me donnes.

Dans les cas 2 et 3, le script aura sa propre sauvegarde et son annulation.

### Étape 3 — Regénérer le rapport
Le rapport en ligne et le PDF se recalculent en direct : dès la restauration faite, ils affichent les bonnes valeurs. Les PDF déjà téléchargés doivent être régénérés et renvoyés.

### Étape 4 — Vérifier les autres régions et modules
Même contrôle pour tous les autres blocs touchés par le script du 29 août, avec la liste des cédulas concernées, pour savoir si d'autres rapports déjà envoyés sont faussés.

## Actions par service

- 🗄️ Base de données (SQL manuel en production) : script de restauration complet + vérification. Je le fournis prêt à copier.
- ⚙️ Web Service (Backend Express) : aucune action.
- 🖥️ Site statique (Frontend) : aucune action — aucun changement de code, le rapport lit la base en direct.

## Point à trancher

Quelle option pour l'étape 2 : ne rien recorriger, ou recorriger seulement les 5 profils « tout à 1 » ?
