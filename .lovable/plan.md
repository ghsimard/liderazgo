# Écoles de Quibdó absentes du formulaire en production

## Constat vérifié

En base de développement, tout est correct : la région « Quibdó 2026 » est reliée à la ville de Quibdó, qui contient bien les 25 écoles, et les 25 apparaissent aussi dans les fichas. Le problème n'existe donc pas ici, il est propre aux données/à l'affichage en production.

Point important sur la façon dont les deux écrans travaillent :

- L'écran d'administration « Fichas de Información / Configuración » affiche la liste **complète** des écoles, sans tenir compte des liens avec la région.
- La liste déroulante du **formulaire de ficha** part de la région choisie, puis descend : région → ville reliée à la région → écoles de cette ville.

C'est pourquoi les deux listes peuvent diverger : si en production le lien entre la région « Quibdó 2026 » et la ville de Quibdó est absent (ou si la région porte un nom différent), l'administration montre les 25 écoles alors que le formulaire n'en montre aucune. Deuxième cause possible : la lecture des écoles est plafonnée à 1000 lignes par le service; si la production contient plus d'écoles que ce plafond, celles de Quibdó peuvent être coupées de la liste.

Ces deux causes n'ont pas pu être confirmées : la base de production n'est pas interrogeable d'ici. La première étape du plan est donc un diagnostic.

## Étape 1 — Diagnostic (🗄️ Base de données, lecture seule)

Fournir un fichier SQL de lecture seule à exécuter en production, qui répond à :

1. Le nom exact de la région de Quibdó et son identifiant.
2. Les villes reliées à cette région (table de liaison région–ville).
3. Le nombre d'écoles rattachées à la ville de Quibdó, et la liste des noms.
4. S'il existe une restriction d'écoles au niveau de la région (liaison région–école) qui limiterait la liste.
5. Le nombre total d'écoles et de villes en production (pour vérifier le plafond de 1000).

## Étape 2 — Correction des données si le lien manque (🗄️ Base de données)

Selon le résultat, fournir un SQL de correction, avec sauvegarde préalable et undo :

- recréer le lien région « Quibdó 2026 » → ville « Quibdó »;
- ou rattacher les écoles orphelines à la bonne ville;
- ou supprimer une restriction région–école incomplète.

Aucune donnée existante n'est écrasée : uniquement des ajouts de liens, réversibles.

## Étape 3 — Robustesse de l'affichage (🖥️ Site statique)

Dans le chargement des données géographiques :

- lire les écoles, villes et liaisons par pages successives, pour ne plus jamais être coupé au plafond de 1000 lignes;
- si une région n'a aucune ville reliée, retomber sur les écoles de l'entité territoriale de la région au lieu d'afficher une liste vide;
- afficher un message clair dans le formulaire lorsque la liste est vide (« No hay instituciones configuradas para esta región »), au lieu d'un menu muet.

## Étape 4 — Cohérence des deux écrans (🖥️ Site statique)

Dans « Fichas de Información / Configuración », signaler visuellement les écoles et villes qui ne sont reliées à aucune région, puisque ce sont exactement celles qui n'apparaîtront jamais dans le formulaire. Cela rend la divergence visible avant qu'un utilisateur la découvre.

## Détails techniques

- `src/hooks/useGeographicData.ts` : pagination explicite (`range`) sur `municipios`, `instituciones`, `region_municipios`, `region_instituciones`; repli sur `entidad_territorial_id` quand `municipio_ids` est vide.
- `src/pages/FichaRLT.tsx` et `src/pages/AdminEditFicha.tsx` : état vide explicite dans le sélecteur d'institution.
- `src/components/admin/AdminGeographyTab.tsx` : badge « sin región » sur les villes/écoles non reliées.
- Nouveau `server/migrations/2026-09-04_diagnostic_quibdo.sql` (lecture seule) puis, si nécessaire, un fichier de correction avec sauvegarde et undo.
- Aucune modification du Web Service Express (les tables concernées sont déjà autorisées).

## Déploiement

1. 🗄️ Exécuter le SQL de diagnostic en production et me transmettre les résultats.
2. 🗄️ Exécuter, si requis, le SQL de correction des liens.
3. 🖥️ Republier le site statique puis Ctrl+Shift+R.
