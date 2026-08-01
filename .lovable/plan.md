# e360 — faire fonctionner l'application autonome (base partagée, schéma `e360`)

On garde l'infrastructure déjà en place : le schéma `e360` existe dans la base Render et les routes `/api/e360app/*` sont déployées sur l'API Express actuelle. L'objectif de cette étape est unique : **que le nouveau site utilise exactement les mêmes dominios, competencias et ítems que RLT**, et que le formulaire 360 fonctionne de bout en bout.

Les licences sont mises de côté : on n'y touche plus tant que l'application ne tourne pas correctement sur sa base.

## Écarts constatés

Chemins appelés par le frontend (`src/lib/dbClient.ts` de E360 Insights) contre chemins réellement servis par `server/e360Routes.js` :

```text
Frontend appelle                 API expose aujourd'hui
/api/e360app/respuestas          /api/e360app/e360/respuestas          DÉCALÉ
/api/e360app/reportes/:cedula    /api/e360app/e360/reportes/:cedula    DÉCALÉ
(aucun appel)                    /api/e360app/e360/estructura          INUTILISÉ
```

Deuxième point, le plus important : le nouveau site affiche des compétences inventées (`src/lib/e360-content.ts` — modèle générique d'entreprise : Autoconocimiento, jefe/par/colaborador) au lieu des 3 dominios / 13 competencias / 39 ítems du modèle RLT.

## Étapes

### ⚙️ Web Service (Express — projet actuel)
1. Aligner les chemins dans `server/e360Routes.js` : retirer le segment `/e360/` de `respuestas`, `reportes/:cedula` et `estructura`, qui fait déjà doublon avec le préfixe `/api/e360app`.
2. Vérifier et compléter `estructura` pour qu'il renvoie la structure complète telle qu'elle existe dans RLT : dominios, competencias, ítems, textes des ítems et pondérations, dans l'ordre d'affichage, lus depuis les vues du schéma `e360` qui pointent sur les tables de configuration de RLT.

### 🗄️ Base de données
3. Aucune migration nécessaire. Les vues de configuration (`e360.v_360_dominios`, `v_360_competencias`, `v_360_items`, `v_360_item_texts`, `v_360_ponderaciones`) existent déjà et sont en lecture seule sur les tables RLT — c'est précisément ce qui garantit que les deux applications partagent la même structure 360.

### 🖥️ Site statique (projet E360 Insights — depuis l'autre onglet)
4. Supprimer `src/lib/e360-content.ts` et charger la structure depuis `/estructura`.
5. Reprendre le formulaire 360 de RLT à l'identique : les 5 rôles d'évaluateur, les phases Entrada / Salida, l'échelle et les libellés réels.
6. Brancher l'envoi des réponses sur `respuestas` et l'affichage du rapport sur `reportes/:cedula`.
7. Confirmer que `VITE_API_URL` pointe sur l'API actuelle.

### Licences — reporté
Les endpoints `licencias`, `tarifas`, `transacciones` et `contrato` restent en place tels quels, sans modification ni protection ajoutée pour l'instant. On les reprendra une fois l'application fonctionnelle, y compris le point de sécurité (ils sont aujourd'hui accessibles sans authentification).

### RLT actuel
Aucun changement fonctionnel. Les routes e360 restent isolées sous `/api/e360app` et le schéma `e360` reste invisible depuis le site RLT : les fichas et résultats saisis sur liderazgo360.co n'apparaîtront pas dans RLT.

## Détails techniques

`server/e360Routes.js` est monté sur `/api/e360app` dans `server/index.ts` ; c'est un module CommonJS qui reçoit le `pool` Postgres. Les tables écrites sont toutes qualifiées `e360.*`, la configuration 360 est lue via les vues du même schéma ; aucune table `public.*` de RLT n'est modifiée.

## Ce que tu auras à faire après mes modifications

- ⚙️ **Web Service** : un redéploiement manuel de l'API sur Render pour activer les chemins corrigés.
- 🖥️ **Site statique** : les étapes 4 à 7 doivent m'être demandées depuis l'onglet **E360 Insights** — je peux lire ce projet d'ici, mais pas y écrire.
