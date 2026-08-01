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

Deux types de licences, avec des tarifs distincts définis par le superadmin :

| Type | Public | Durée | Prix |
|---|---|---|---|
| `rector` | Recteurs / directivos (utilisateurs finaux) | définie par le contrat | tarif « rector » configurable |
| `administrador` | Administrateurs du système e360 | **1 an** (par défaut, date d'expiration auto-calculée) | tarif « administrador » configurable |

- **Pool initial** : 150 sièges `rector` ; le nombre de sièges `administrador` est fixé par le superadmin.
- **Attribution** : le superadmin assigne un siège à une cédula en choisissant le type. Le compteur « utilisées / disponibles » se met à jour par type.
- **États d'un siège** : `activa`, `suspendida`, `revocada` (libère le siège), `expirada` (automatique quand la date d'expiration est dépassée).
- **Renouvellement** : une licence `administrador` peut être renouvelée pour 12 mois supplémentaires ; le renouvellement génère une nouvelle ligne de transaction au tarif en vigueur.
- **Contrôle d'accès** : à la connexion, le site e360 vérifie qu'il existe une licence `activa` non expirée pour la cédula. Les fonctions d'administration exigent en plus une licence de type `administrador`.
- **Garde-fou** : impossible d'attribuer un siège au-delà du pool du type concerné.

## Tarification (superadmin)

- Table de tarifs par type de licence : montant, devise, durée par défaut (mois), date d'entrée en vigueur.
- Historique des tarifs conservé : une transaction enregistre toujours le prix appliqué **au moment de l'opération**, jamais le prix courant.
- Modification d'un tarif = nouvelle version, les transactions passées restent intactes.

## Journal des transactions

Toute opération de licence produit une ligne de transaction immuable :
- Type d'opération : `asignacion`, `renovacion`, `cambio_tipo`, `suspension`, `reactivacion`, `revocacion`, `expiracion`, `ajuste_pool`, `cambio_tarifa`.
- Champs : cédula, type de licence, quantité, prix unitaire appliqué, montant total, devise, période couverte (début/fin), état avant/après, auteur (superadmin), date/heure, note libre.
- Aucune suppression ni modification possible depuis l'interface (append-only).
- Vue de synthèse : totaux facturés par période, par type de licence, par état.
- Export CSV du journal complet et filtré.

## Panneau superadmin (nouveau site e360)

Onglet **Licencias** avec sous-onglets :

1. **Licencias** — bandeau de compteurs par type (Total / Activas / Suspendidas / Disponibles), tableau (cédula, nombre, correo, tipo, estado, fecha de asignación, fecha de expiración, acciones), actions : asignar, renovar, suspender, reactivar, revocar, cambiar fecha de expiración, asignación masiva, export CSV.
2. **Tarifas** — édition des prix par type de licence, durée par défaut, devise, historique des tarifs.
3. **Transacciones** — journal complet, filtres (cédula, tipo, operación, rango de fechas), totaux, export CSV.
4. **Contrato** — nombre total de sièges par type, dates du contrat, état.


## Détails techniques

### Base de données (SQL manuel sur Render)
1. `CREATE SCHEMA e360;`
2. `e360.licencias_contrato` : `nombre_contrato`, `total_rector` (150), `total_administrador`, `fecha_inicio`, `fecha_fin`, `estado`.
3. `e360.licencias_tarifas` : `tipo_licencia` (`rector|administrador`), `precio`, `moneda`, `duracion_meses` (12 pour `administrador`), `vigente_desde`, `vigente_hasta`, `created_by`.
4. `e360.licencias` : `contrato_id`, `cedula`, `nombres_apellidos`, `correo`, `tipo_licencia`, `estado` (`activa|suspendida|revocada|expirada`), `fecha_asignacion`, `fecha_expiracion`, `asignada_por`, `created_at`, `updated_at` + index unique partiel sur `(cedula, tipo_licencia)` là où `estado NOT IN ('revocada','expirada')`.
5. `e360.licencias_transacciones` (append-only) : `licencia_id`, `cedula`, `tipo_licencia`, `operacion`, `cantidad`, `precio_unitario`, `monto_total`, `moneda`, `tarifa_id`, `periodo_inicio`, `periodo_fin`, `estado_anterior`, `estado_nuevo`, `actor`, `nota`, `created_at`. Aucun `UPDATE`/`DELETE` (trigger de blocage).
6. Trigger de contrôle du pool : refuse un `INSERT`/passage à `activa` si le nombre d'actives du type concerné dépasse le total du contrat.
7. Trigger d'écriture automatique d'une transaction à chaque changement d'état ou attribution, avec le tarif en vigueur à la date de l'opération.
8. Fonction d'expiration : passe les licences dont `fecha_expiracion < now()` à `expirada` et journalise l'opération.
9. Vues de configuration partagée : `e360.v_360_dominios`, `e360.v_360_competencias`, `e360.v_360_items`, `e360.v_360_ponderaciones` pointant vers les tables `public` correspondantes.
10. Tables de données propres à e360 (fichas, encuestas, resultados) créées dans `e360`, structure identique à l'actuelle.
11. `GRANT USAGE ON SCHEMA e360` + `GRANT` sur les tables pour le rôle utilisé par le proxy Express.

Pas de RLS ni de policies (contrainte Render en vigueur) : le contrôle d'accès reste applicatif, dans le proxy Express et le frontend.

### Web Service (Express, backend)
- Autoriser le schéma `e360` dans le shim/proxy (les requêtes du nouveau site ciblent `e360.<table>`).
- Ajouter le domaine du nouveau site à la liste CORS.
- Middleware de vérification de licence : sur les routes de données e360, refuser (403) si la cédula du JWT/session n'a pas de licence active ; exiger `tipo_licencia = 'administrador'` sur les routes d'administration.
- Tâche planifiée (ou vérification à la connexion) appelant la fonction d'expiration.

### Site statique (Frontend, nouveau projet Lovable)
- Reprise des pages/composants 360 existants, branchés sur `e360.*` via `dbClient`.
- Nouveau composant `AdminLicenciasTab` avec les 4 sous-onglets (Licencias, Tarifas, Transacciones, Contrato), visible uniquement pour le superadmin.
- Garde de licence au niveau du routeur : écran de blocage si aucune licence active ou licence expirée.
- UI intégralement en espagnol.

### Site actuel RLT
Aucun changement : il ne voit pas le schéma `e360`, donc ni les fichas ni les résultats du nouveau site.

## Étapes

1. Validation du modèle de licence (2 types, tarifs, journal) et du schéma dédié.
2. SQL manuel sur Render : schéma, contrat, tarifs, licences, transactions, triggers, vues de config, grants.
3. Création du projet Lovable e360 + migration des composants 360.
4. Implémentation de l'onglet Licencias (4 sous-onglets) et du garde de licence.
5. Backend : CORS, accès schéma `e360`, middleware licence + rôle administrador, expiration automatique.
6. Chargement des 150 licences `rector`, création des licences `administrador`, tests d'attribution / renouvellement / suspension / révocation et vérification du journal de transactions.
