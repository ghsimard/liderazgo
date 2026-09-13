# Supprimer entièrement « META » et fiabiliser l'import

## Diagnostic (vérifié en base)

- L'import a créé une **nouvelle entité « META »** (majuscules) alors que **« Meta » existait déjà** depuis février. La correspondance se fait sur le nom exact : « META » ≠ « Meta ».
- Ancienne « Meta » (21 février) : 27 municipalités, 0 école. **Conservée telle quelle.**
- Nouvelle « META » (ce soir) : 26 municipalités, 40 écoles. **Supprimée intégralement.**

## Ce que je propose

### Étape 1 — Suppression complète de « META » (SQL manuel en production)

Script unique, transaction BEGIN/COMMIT, avec sauvegarde préalable dans `_undo_meta_delete_20260913` (entité, 26 municipalités, 40 écoles et leurs éventuels liens de région) pour pouvoir tout restaurer en cas d'erreur.

Ordre de suppression :
1. Liens de région éventuels vers ces écoles, municipalités et l'entité.
2. Les **40 écoles** rattachées aux municipalités de « META ».
3. Les **26 municipalités** de « META ».
4. L'**entité « META »**.

Bloc de vérification final : il ne doit rester qu'une seule entité nommée « Meta », avec ses 27 municipalités d'origine.

Après ça, vous relancez votre CSV corrigé : l'import rattachera les municipalités et écoles à l'entité « Meta » existante.

### Étape 2 — Fiabiliser l'import (frontend)

Aujourd'hui l'import compare les noms caractère par caractère. Correctif dans l'écran d'import géographique :

- Comparaison des entités, municipalités et écoles **insensible à la casse, aux espaces superflus et aux accents**.
- Quand un nom existe déjà, on réutilise l'enregistrement existant et **on conserve son orthographe d'origine** plutôt que d'en créer un second.
- Le récapitulatif de fin d'import indiquera aussi le nombre d'éléments **réutilisés**, pour voir immédiatement ce qui a été créé et ce qui a été rattaché.

Même si votre CSV est déjà corrigé, ce correctif évite que le problème revienne avec un prochain fichier.

### Étape 3 — Contrôler les autres doublons

Requête de contrôle sur toutes les entités et municipalités (noms identiques à la casse/accents près) pour confirmer que « Meta » était le seul cas.

## Actions par service

- 🗄️ Base de données (SQL manuel en production) : script de sauvegarde + suppression + vérification + undo. Je le fournis prêt à copier.
- 🖥️ Site statique (Frontend) : correctif de l'import géographique — publication Lovable puis Ctrl+Shift+R.
- ⚙️ Web Service (Backend Express) : aucune action.

## À savoir

Les 40 écoles importées ce soir seront bien supprimées. Elles reviendront lors du prochain import du CSV corrigé, cette fois sous l'entité « Meta ».
