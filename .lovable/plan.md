# Doublon d'entité territoriale « Meta » / « META »

## Diagnostic (vérifié en base)

- L'import CSV géographique a créé ce soir une **nouvelle entité « META »** (en majuscules) alors que **« Meta » existait déjà** depuis février. La correspondance lors de l'import est sensible à la casse : « META » ≠ « Meta ».
- Ancienne « Meta » : 27 municipalités, **0 institution**, aucun lien de région.
- Nouvelle « META » : 26 municipalités, **40 institutions** (celles de l'import).
- **17 municipalités existent en double** (même nom dans les deux entités : Cabuyaro, Granada, La Macarena, etc.). 9 sont nouvelles et n'existent que dans « META ».

## Ce que je propose

### Étape 1 — Fusionner dans l'ancienne « Meta » (SQL manuel en production)

Script avec sauvegarde (table `_undo_meta_merge_20260913`), transaction BEGIN/COMMIT et bloc de vérification :

1. **Municipalités en double (17)** : réattribuer leurs institutions à la municipalité homonyme de l'ancienne « Meta », puis supprimer les doublons de « META ».
2. **Municipalités nouvelles (9)** : les rattacher à l'ancienne « Meta » (simple changement de rattachement, aucune donnée perdue).
3. **Supprimer l'entité « META »** devenue vide.
4. **Normaliser le nom** : « Meta » reste tel quel (casse d'origine).

Résultat : une seule entité « Meta », 36 municipalités, 40 institutions.

### Étape 2 — Corriger l'import CSV (frontend)

Rendre la correspondance entité/municipalité **insensible à la casse et aux espaces** dans l'import géographique, pour que « META », « Meta » ou « meta » pointent toujours vers la même entité existante. Sans ce correctif, le prochain import recréera un doublon.

### Étape 3 — Vérifier l'absence d'autres doublons

Requête de contrôle sur toutes les entités (doublons de noms insensibles à la casse) pour s'assurer que « Meta » est le seul cas.

## Actions par service

- 🗄️ Base de données (SQL manuel en production) : script de fusion + vérification + undo. Je le fournis prêt à copier.
- 🖥️ Site statique (Frontend) : correctif de l'import CSV (comparaison insensible à la casse) — publication Lovable.
- ⚙️ Web Service (Backend Express) : aucune action.

## Point à trancher

Aucun : la fusion conserve toutes les données. Les municipalités en double ont des noms identiques, il n'y a pas d'ambiguïté.
