# Excepciones 360 : cases déverrouillées avec priorité au choix manuel

## Règle actuelle

Pour les Centros Educativos, les cases « Sin estudiantes » et « Sin administrativos » sont pré-cochées et verrouillées : la règle automatique s'applique toujours, impossible de la retirer.

## Nouvelle règle demandée

- Les cases restent **cochées par défaut** pour les Centros Educativos (règle automatique).
- Mais elles deviennent **modifiables** : un administrateur peut décocher.
- Dès qu'un choix manuel existe pour une école, **c'est lui qui décide**, même pour un Centro Educativo : case décochée = le rôle redevient exigé avec un minimum de 1.

## Ce qui change concrètement

**Écran « Excepciones » (admin)**
- Toutes les cases sont cliquables (sauf lecture seule).
- Affichage initial : case cochée si une exception manuelle existe, sinon selon la règle automatique (Centro Educativo = coché).
- Le badge « Centro Educativo » reste affiché à titre d'information.

**Calcul des rôles exigés (toute l'app : moniteur, hub, bandeau « Informe parcial »)**
- Si une exception manuelle est enregistrée pour l'école : elle seule compte.
- Sinon : la règle automatique des Centros Educativos s'applique.

## Détails techniques

- `src/utils/encuesta360Requirements.ts` — `roleKeysForInstitucion` : si la map contient une ligne pour l'institution, utiliser ses valeurs telles quelles ; sinon retomber sur `isCentroEducativo`.
- `src/components/admin/AdminExcepciones360Tab.tsx` — cases non verrouillées pour les CE ; valeur affichée = exception manuelle si présente, sinon défaut CE ; la sauvegarde (upsert) enregistre toujours les deux valeurs explicitement.

## Actions par environnement

- 🖥️ **Site statique (Frontend)** : les deux fichiers ci-dessus, puis Publish et Ctrl+Shift+R.
- ⚙️ **Web Service (Express)** : aucune action (la table est déjà dans la liste blanche).
- 🗄️ **Base de données** : aucune action.
