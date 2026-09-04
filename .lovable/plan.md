# Couper la propagation E360 → RLT et restaurer le référentiel d'avant le 3 août

## Origine confirmée

Les routes d'administration de E360 Insights, servies par la même API Express (`server/e360Routes.js`, montées sous `/api/e360app`), écrivent **directement dans les tables partagées de RLT** :

- `POST /admin/geo/importar-due` — importation depuis le Directorio Único de Establecimientos;
- `POST /admin/geo/importar` — importation en lot;
- `POST /admin/geo/sincronizar-territorio` — synchronisation territoriale;
- création, modification et suppression d'entités territoriales, de villes et d'écoles.

Au total, 30 écritures visent `public.entidades_territoriales`, `public.municipios` et `public.instituciones` — exactement les tables dont dépendent les formulaires RLT. C'est l'importation du **3 août 2026 à 09:46** qui a porté le référentiel à 22 380 écoles et 1 170 villes.

Deuxième constat, indépendant : la table de liaison région → ville est **vide** (0 ligne) en production. Le formulaire de ficha part de la région pour trouver les villes puis les écoles : sans ce lien, la liste déroulante est vide pour toutes les régions. L'administration, elle, affiche la liste brute et ne voit donc pas le problème.

## Étape 1 — Couper la propagation (⚙️ Web Service Express)

Neutraliser toute écriture de E360 vers les tables géographiques de RLT :

- désactiver les trois routes d'importation et de synchronisation (`importar-due`, `importar`, `sincronizar-territorio`) : elles renvoient une erreur explicite indiquant que le référentiel géographique est géré par RLT;
- désactiver les créations, modifications et suppressions d'entités, villes et écoles côté E360;
- conserver les **lectures** (`/admin/geo`, `/instituciones-directivos`) : E360 continue de consulter le référentiel RLT sans pouvoir le modifier.

Cette étape à elle seule garantit qu'aucune nouvelle importation ne pourra polluer RLT.

## Étape 2 — Restaurer la liste d'avant le 3 août (🗄️ Base de données)

SQL à exécuter en production, avec sauvegarde complète et undo :

1. Sauvegarder dans `_undo_geo_import_20260803` toutes les écoles et villes créées le 3 août 2026 (repérées par leur horodatage de création), avec leurs liaisons.
2. Supprimer ces écoles et ces villes **uniquement si elles ne sont référencées nulle part** : aucune ficha, aucune enquête, aucune assignation, aucune liaison régionale. Les rares lignes retenues par une référence sont listées à part pour décision.
3. Vérifier ensuite que Quibdó retrouve ses 25 écoles et le Oriente ses 16.

Le référentiel revient ainsi à son état du 21 février, augmenté des ajouts légitimes faits depuis par les administrateurs RLT.

## Étape 3 — Rétablir les liens région → ville (🗄️ Base de données)

SQL avec sauvegarde et undo qui recrée les liaisons disparues :

- « Quibdó 2026 » → ville de Quibdó;
- « Oriente 2026 » → les 11 villes du Oriente rattachées à Antioquia (El Retiro, La Ceja, El Carmen de Viboral, Marinilla, El Santuario, San Rafael, San Carlos, San Luis, El Peñol, Granada, San Vicente).

Effet immédiat : les listes déroulantes redeviennent fonctionnelles.

## Étape 4 — Corriger les écarts de noms restants (🗄️ Base de données)

- « Centro Educativo Jesús Antonio Velásquez del 20 » → « Centro Educativo José Antonio Velásquez del 20 », le nom réellement utilisé dans les fichas, via le mécanisme de renommage existant qui propage partout;
- vérifier les six écoles supprimées le 4 septembre et le renommage vers « Institución Educativa MIA Jorge Valencia Lozano » : les rétablir si l'un d'eux était une école officielle.

## Étape 5 — Robustesse de l'affichage (🖥️ Site statique)

- Lire écoles, villes et liaisons par pages successives, pour ne plus être coupé au plafond de 1000 lignes tant que le référentiel reste volumineux.
- Afficher un message explicite dans le formulaire quand aucune école n'est disponible, au lieu d'un menu vide.
- Dans « Fichas de Información / Configuración », marquer les villes et écoles non reliées à une région : ce sont exactement celles invisibles dans les formulaires.

## Détails techniques

- `server/e360Routes.js` : neutralisation des routes d'écriture géographique, lectures conservées.
- Nouveaux fichiers SQL sous `server/migrations/` : `2026-09-04_rollback_import_geo_e360.sql` et `2026-09-04_restaurer_region_municipios.sql`, chacun avec table `_undo_*`, vérifications et bloc undo.
- Liste de référence : `src/data/instituciones.ts` (25 Quibdó, 16 Oriente).
- `src/hooks/useGeographicData.ts` : pagination `range`.
- `src/pages/FichaRLT.tsx`, `src/pages/AdminEditFicha.tsx` : état vide explicite.
- `src/components/admin/AdminGeographyTab.tsx` : badge « sin región ».

## Déploiement

1. ⚙️ Redéployer le Web Service Express (coupure de la propagation) — à faire en premier, pour qu'aucune importation ne survienne pendant la restauration.
2. 🗄️ Exécuter le SQL de retour arrière de l'import du 3 août.
3. 🗄️ Exécuter le SQL de rétablissement des liens région → ville, puis vérifier le formulaire en production.
4. 🖥️ Republier le site statique, puis Ctrl+Shift+R.
