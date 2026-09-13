# Pourquoi l'import échouait en production (et pas en dev)

## Cause confirmée

La base contient aujourd'hui **1 051 municipios**. L'import lisait la liste existante en **une seule requête plafonnée à 1 000 lignes** : 51 municipios restaient donc invisibles pour lui.

Enchaînement :

1. L'import croit que ces 51 municipios n'existent pas.
2. Il essaie de les recréer.
3. La base refuse (un municipio doit être unique par entité) → **tout le lot de 50 lignes est rejeté d'un coup**.
4. Sans ces municipios, les écoles rattachées sont ignorées.
5. Aucune erreur n'était affichée : le code ne regardait que le résultat, jamais le message d'erreur. D'où l'impression que « rien ne se passe ».

En dev, avant, la table faisait moins de 1 000 lignes : le problème ne pouvait pas apparaître. Il s'est déclenché dès que la barre des 1 000 a été franchie.

S'ajoutait un second effet : la comparaison était sensible à la casse et aux accents, ce qui a créé le doublon « META » / « Meta ».

## Ce qui est déjà corrigé (pas encore en production)

- Lecture complète de toutes les listes, par pages de 1 000, sans plafond.
- Comparaison insensible à la casse, aux accents et aux espaces multiples.
- Message de fin d'import indiquant ce qui a été réutilisé et ce qui a été créé.

## Ce que je propose d'ajouter avant de déployer

### 1. Afficher les erreurs au lieu de les avaler
À chaque étape de l'import (entités, municipios, écoles), lire le message d'erreur renvoyé et l'afficher. Si un lot échoue, l'import s'arrête avec une explication claire au lieu de finir en silence.

### 2. Ne plus perdre 50 lignes à cause d'une seule
Si un lot de 50 est refusé, réessayer ligne par ligne : les lignes valides passent, seules les vraies erreurs sont listées à la fin.

### 3. Résumé de fin d'import détaillé
Créés / réutilisés / ignorés pour chaque niveau, plus la liste des lignes en échec.

## Actions par service

- 🖥️ **Site statique (Frontend)** : toutes les modifications ci-dessus. Publication via Lovable, puis Ctrl+Shift+R.
- ⚙️ **Web Service (Backend Express)** : aucune action.
- 🗄️ **Base de données (SQL manuel)** : aucune action nouvelle ; seul le script déjà prêt `2026-09-13_supprimer_entidad_meta_doublon.sql` reste à passer en production si ce n'est pas déjà fait.

## Détails techniques

- `src/components/admin/AdminGeographyTab.tsx`, `handleImport` : récupérer `error` sur chaque `insert`, arrêter et remonter le message ; fallback d'insertion unitaire en cas d'échec de lot ; compteurs d'échecs dans le toast final.
- `fetchTable` pagine déjà par 1 000 ; le proxy Express plafonne à 5 000 lignes par requête, la pagination reste donc indispensable.
- Contraintes en jeu : `UNIQUE(nombre, entidad_territorial_id)` sur `municipios`, `UNIQUE(nombre, municipio_id)` sur `instituciones`.
