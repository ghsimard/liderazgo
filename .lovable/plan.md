# Encuesta 360 autonome — Gestion des licences (par utilisateur)

## Objectif

Le nouveau site e360 doit être cessible clé en main au client plus tard, et vendre entre-temps des **licences par utilisateur** (150 licences au départ), pilotées depuis un panneau superadmin.

## Décision d'architecture recommandée

Utiliser un **schéma Postgres dédié `e360`** dans la même base.

- Cession future = `pg_dump --schema=e360` + remise du dépôt frontend : rien à démêler.
- Les données e360 (fichas, réponses, licences) ne sont jamais visibles depuis le site RLT actuel, puisqu'elles ne sont pas dans `public`.
- La configuration 360 partagée (dominios, competencias, ítems, ponderaciones) reste dans `public` et est lue par e360 via des **vues** `e360.v_*` — synchro bidirectionnelle instantanée tant que les deux sites coexistent.
- Au moment de la cession, ces vues sont remplacées par des tables matérialisées (copie figée) : le client part avec une base complète et autonome.

## Modèle de licence

Une licence = un utilisateur (une cédula) autorisé à accéder au site e360.

- **Pool** : un contrat/tenant possède un nombre de sièges (150 au départ).
- **Attribution** : le superadmin assigne un siège à une cédula. Le compteur « utilisées / disponibles » se met à jour.
- **États d'un siège** : `activa`, `suspendida`, `revocada` (libère le siège), avec date d'attribution et date d'expiration.
- **Contrôle d'accès** : à la connexion, le site e360 vérifie qu'il existe une licence `activa` non expirée pour la cédula. Sinon, message de blocage (« Licencia no activa o expirada »).
- **Garde-fou** : impossible d'attribuer un siège au-delà du pool ; le superadmin doit d'abord révoquer ou augmenter le pool.
- **Journal** : chaque attribution, suspension, réactivation, révocation est tracée (qui, quand, quelle cédula).

## Panneau superadmin (nouveau site e360)

Onglet **Licencias** :
- Bandeau de compteurs : Total / Activas / Suspendidas / Disponibles.
- Tableau des licences : cédula, nombre, correo, estado, fecha de asignación, fecha de expiración, acciones.
- Actions : asignar licencia (recherche par cédula), suspender, reactivar, revocar, cambiar fecha de expiración.
- Actions en lot : asignación masiva depuis une liste de cédulas, suspension en lot.
- Édition du pool (nombre total de licences du contrat) réservée au superadmin.
- Export CSV de l'état des licences.
- Sous-onglet **Historial** : journal des mouvements, filtrable par cédula et par date.

## Détails techniques

### Base de données (SQL manuel sur Render)
1. `CREATE SCHEMA e360;`
2. `e360.licencias_contrato` : `nombre_contrato`, `total_licencias` (150), `fecha_inicio`, `fecha_fin`, `estado`.
3. `e360.licencias` : `contrato_id`, `cedula`, `nombres_apellidos`, `correo`, `estado` (`activa|suspendida|revocada`), `fecha_asignacion`, `fecha_expiracion`, `asignada_por`, `created_at`, `updated_at` + index unique partiel sur `cedula` là où `estado <> 'revocada'`.
4. `e360.licencias_log` : `licencia_id`, `cedula`, `accion`, `estado_anterior`, `estado_nuevo`, `actor`, `created_at`.
5. Trigger de contrôle du pool : refuse un `INSERT`/passage à `activa` si le nombre d'actives dépasse `total_licencias`.
6. Vues de configuration partagée : `e360.v_360_dominios`, `e360.v_360_competencias`, `e360.v_360_items`, `e360.v_360_ponderaciones` pointant vers les tables `public` correspondantes.
7. Tables de données propres à e360 (fichas, encuestas, resultados) créées dans `e360`, structure identique à l'actuelle.
8. `GRANT USAGE ON SCHEMA e360` + `GRANT` sur les tables pour le rôle utilisé par le proxy Express.

Pas de RLS ni de policies (contrainte Render en vigueur) : le contrôle d'accès reste applicatif, dans le proxy Express et le frontend.

### Web Service (Express, backend)
- Autoriser le schéma `e360` dans le shim/proxy (les requêtes du nouveau site ciblent `e360.<table>`).
- Ajouter le domaine du nouveau site à la liste CORS.
- Middleware de vérification de licence : sur les routes de données e360, refuser (403) si la cédula du JWT/session n'a pas de licence active.

### Site statique (Frontend, nouveau projet Lovable)
- Reprise des pages/composants 360 existants, branchés sur `e360.*` via `dbClient`.
- Nouveau composant `AdminLicenciasTab` (tableau, compteurs, actions, historial), visible uniquement pour le superadmin.
- Garde de licence au niveau du routeur : écran de blocage si aucune licence active.
- UI intégralement en espagnol.

### Site actuel RLT
Aucun changement : il ne voit pas le schéma `e360`, donc ni les fichas ni les résultats du nouveau site.

## Étapes

1. Validation du modèle de licence et du schéma dédié.
2. SQL manuel sur Render : schéma, tables licences, log, trigger de pool, vues de config, grants.
3. Création du projet Lovable e360 + migration des composants 360.
4. Implémentation de l'onglet Licencias et du garde de licence.
5. Backend : CORS, accès schéma `e360`, middleware licence.
6. Chargement des 150 licences initiales et tests d'attribution/suspension/révocation.
