# Écoles de Quibdó : liste incomplète et erronée en production

## Constat vérifié

En base de développement, tout est correct : la région « Quibdó 2026 » est reliée à la ville de Quibdó, qui contient bien les 25 écoles, et les 25 apparaissent aussi dans les fichas. Le problème est donc propre aux données de production.

Point important sur la façon dont les deux écrans travaillent :

- L'écran d'administration « Fichas de Información / Configuración » affiche la liste **complète** des écoles, sans tenir compte des liens avec la région.
- La liste déroulante du **formulaire de ficha** part de la région choisie, puis descend : région → ville reliée à la région → écoles de cette ville.

C'est pourquoi les deux listes peuvent diverger : si en production le lien entre la région « Quibdó 2026 » et la ville de Quibdó est absent (ou si la région porte un nom différent), l'administration montre des écoles alors que le formulaire n'en montre aucune.

Le fait que la liste soit à la fois **incomplète et erronée** oriente vers une modification récente des données : renommages d'écoles, suppressions, ou écoles créées sous la mauvaise ville. Ces hypothèses ne sont pas confirmées : la base de production n'est pas interrogeable d'ici. Le plan commence donc par un diagnostic, avant toute correction.

## Étape 1 — Diagnostic (🗄️ Base de données, lecture seule)

Fournir un fichier SQL de lecture seule à exécuter en production, qui répond à :

1. Le nom exact de la région de Quibdó et son identifiant.
2. Les villes reliées à cette région (table de liaison région–ville).
3. La liste des écoles rattachées à la ville de Quibdó, à comparer avec la liste officielle des 25.
4. Les écoles dont le nom ne correspond à aucune des 25 (noms erronés, doublons, variantes).
5. L'historique des renommages d'écoles (table d'historique posée le 4 septembre) et le contenu de la corbeille, pour savoir ce qui a été modifié ou supprimé récemment.
6. Le nombre total d'écoles et de villes (pour écarter le plafond de lecture de 1000 lignes).

Je compare ensuite les résultats à la liste de référence des 25 écoles de Quibdó et je remets un rapport : ce qui manque, ce qui est en trop, ce qui a été renommé.

## Étape 2 — Correction des données (🗄️ Base de données)

Selon le diagnostic, fournir un SQL de correction avec sauvegarde préalable et undo :

- rétablir le lien région « Quibdó 2026 » → ville « Quibdó » s'il manque;
- corriger les noms erronés et rattacher les écoles à la bonne ville;
- réinsérer les écoles manquantes de la liste de référence;
- fusionner les doublons éventuels en propageant le bon nom partout (le mécanisme de renommage existant s'en charge).

Aucune donnée n'est écrasée sans sauvegarde; chaque bloc est réversible.

## Étape 3 — Robustesse de l'affichage (🖥️ Site statique)

Dans le chargement des données géographiques :

- lire écoles, villes et liaisons par pages successives, pour ne jamais être coupé au plafond de 1000 lignes;
- si une région n'a aucune ville reliée, retomber sur les écoles de son entité territoriale au lieu d'une liste vide;
- afficher un message clair dans le formulaire quand la liste est vide (« No hay instituciones configuradas para esta región ») au lieu d'un menu muet.

## Étape 4 — Cohérence des deux écrans (🖥️ Site statique)

Dans « Fichas de Información / Configuración », signaler visuellement les villes et écoles qui ne sont reliées à aucune région : ce sont exactement celles qui n'apparaîtront jamais dans le formulaire. La divergence devient visible avant qu'un utilisateur la découvre.

## Détails techniques

- Nouveau `server/migrations/2026-09-04_diagnostic_quibdo.sql` (lecture seule), puis un fichier de correction avec sauvegarde et undo.
- `src/hooks/useGeographicData.ts` : pagination explicite (`range`) sur `municipios`, `instituciones`, `region_municipios`, `region_instituciones`; repli sur `entidad_territorial_id` quand `municipio_ids` est vide.
- `src/pages/FichaRLT.tsx` et `src/pages/AdminEditFicha.tsx` : état vide explicite dans le sélecteur d'institution.
- `src/components/admin/AdminGeographyTab.tsx` : badge « sin región » sur les villes/écoles non reliées.
- Liste de référence des 25 écoles : `src/data/instituciones.ts`.
- Aucune modification du Web Service Express (les tables concernées sont déjà autorisées).

## Déploiement

1. 🗄️ Exécuter le SQL de diagnostic en production et me transmettre les résultats.
2. 🗄️ Exécuter le SQL de correction des données.
3. 🖥️ Republier le site statique puis Ctrl+Shift+R.
