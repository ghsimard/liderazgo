# Supprimer le doublon « META » et fiabiliser l'import

## Diagnostic (vérifié en base)

- L'import a créé une **nouvelle entité « META »** (majuscules) alors que **« Meta » existait déjà** depuis février. La correspondance se fait sur le nom exact : « META » ≠ « Meta ».
- Ancienne « Meta » : 27 municipalités, **0 école**, aucun lien de région.
- Nouvelle « META » : 26 municipalités, **40 écoles** (celles de l'import).
- **17 municipalités portent le même nom dans les deux** (Cabuyaro, Granada, La Macarena…). 9 n'existent que dans « META ».

Important : supprimer « META » telle quelle effacerait les 40 écoles. On la supprime donc **après** avoir transféré son contenu dans « Meta ».

## Ce que je propose

### Étape 1 — Transférer puis supprimer « META » (SQL manuel en production)

Script unique, avec sauvegarde (`_undo_meta_merge_20260913`), transaction BEGIN/COMMIT et bloc de vérification :

1. **17 municipalités en double** : rattacher leurs écoles à la municipalité homonyme de « Meta », puis supprimer ces doublons.
2. **9 municipalités uniques** : les rattacher à « Meta ».
3. **Supprimer l'entité « META »**, désormais vide.

Résultat attendu : une seule entité « Meta », 36 municipalités, 40 écoles. Aucune donnée perdue.

### Étape 2 — Fiabiliser l'import (frontend)

Aujourd'hui l'import compare les noms caractère par caractère. Correctif dans l'écran d'import géographique :

- Comparaison des entités, municipalités et écoles **insensible à la casse, aux espaces superflus et aux accents**.
- Quand un nom existe déjà, on réutilise l'enregistrement existant et **on conserve son orthographe d'origine** plutôt que d'en créer un second.
- Le récapitulatif de fin d'import indiquera aussi le nombre d'éléments **réutilisés**, pour voir immédiatement ce qui a été créé et ce qui a été rattaché.

Vous avez déjà corrigé la casse dans votre CSV ; ce correctif évite que le problème revienne avec un prochain fichier.

### Étape 3 — Contrôler les autres doublons

Requête de contrôle sur toutes les entités et municipalités (noms identiques à la casse/accents près) pour confirmer que « Meta » était le seul cas.

## Actions par service

- 🗄️ Base de données (SQL manuel en production) : script de transfert + suppression + vérification + undo. Je le fournis prêt à copier.
- 🖥️ Site statique (Frontend) : correctif de l'import géographique — publication Lovable puis Ctrl+Shift+R.
- ⚙️ Web Service (Backend Express) : aucune action.
