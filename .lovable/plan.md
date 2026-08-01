# e360 — finaliser l'application autonome (base partagée, schéma `e360`)

On garde l'infrastructure déjà en place : le schéma `e360` existe dans la base Render, les tables de licences sont créées, et les routes `/api/e360app/*` sont déployées sur l'API Express actuelle. Il reste à corriger les écarts entre ce que le frontend **E360 Insights** appelle et ce que l'API expose, à sécuriser les endpoints d'administration, puis à remplacer le contenu inventé du nouveau site par le vrai modèle 360 de RLT.

## Écarts constatés

Chemins appelés par le frontend (`src/lib/dbClient.ts` de E360 Insights) contre chemins réellement servis par `server/e360Routes.js` :

```text
Frontend appelle                          API expose aujourd'hui
/api/e360app/licencias/verificar/:cedula  /api/e360app/licencias/verificar/:cedula   OK
/api/e360app/licencias/acceso             (n'existe pas)                             MANQUE
/api/e360app/respuestas                   /api/e360app/e360/respuestas               DÉCALÉ
/api/e360app/reportes/:cedula             /api/e360app/e360/reportes/:cedula         DÉCALÉ
(aucun appel)                             /api/e360app/e360/estructura               INUTILISÉ
/api/e360app/licencias | tarifas |        idem, mais sans aucune authentification    NON PROTÉGÉ
  transacciones | contrato
```

Deuxième point : le nouveau site affiche des compétences inventées (`src/lib/e360-content.ts` — modèle générique d'entreprise) au lieu des 3 dominios / 13 competencias / 39 ítems du modèle RLT.

## Étapes

### ⚙️ Web Service (Express — projet actuel)
1. Aligner les chemins dans `server/e360Routes.js` : retirer le segment `/e360/` de `respuestas`, `reportes/:cedula` et `estructura`, qui font déjà partie du préfixe `/api/e360app`.
2. Ajouter `POST /licencias/acceso` : à la première connexion d'un rector par cédula, créer ou activer sa licence à partir du pool du contrat, puis renvoyer le même format que `verificar`. Idempotent — un deuxième appel ne consomme pas de siège supplémentaire.
3. Protéger les endpoints d'administration (`GET/POST /licencias`, `GET/POST /tarifas`, `GET /transacciones`, `PUT /contrato`) derrière un contrôle d'accès superadmin. Les endpoints publics restent `verificar`, `acceso`, `respuestas`, `reportes`, `estructura`.
4. Vérifier que `estructura` renvoie bien dominios, competencias, ítems, textes et pondérations lus depuis les vues du schéma `e360`.

### 🗄️ Base de données (SQL manuel)
5. Aucune nouvelle migration prévue à cette étape. Si l'étape 2 révèle qu'une colonne manque sur `e360.licencias` (par exemple un marqueur de première activation), un script SQL séparé sera fourni pour pgAdmin.

### 🖥️ Site statique (projet E360 Insights — depuis l'autre onglet)
6. Supprimer `src/lib/e360-content.ts` et charger la structure réelle depuis `/estructura` au lieu du contenu codé en dur.
7. Reprendre le formulaire 360 de RLT : 5 rôles d'évaluateur, phases Entrada / Salida, échelle et libellés identiques.
8. Brancher l'écran d'entrée sur `acceso` (création ou réactivation de la licence), puis sur `verificar` aux visites suivantes.
9. Compléter le panel superadmin : Licencias, Tarifas, Transacciones, Contrato.
10. Confirmer que `VITE_API_URL` pointe sur l'API actuelle.

### RLT actuel
Aucun changement fonctionnel. Les routes e360 restent isolées sous `/api/e360app` et le schéma `e360` reste invisible depuis le site RLT : les fichas et résultats saisis sur liderazgo360.co n'apparaîtront pas dans RLT.

## Détails techniques

`server/e360Routes.js` est monté sur `/api/e360app` dans `server/index.ts` ; c'est un module CommonJS qui reçoit le `pool` Postgres. Le contrôle d'accès de l'étape 3 réutilisera le `requireAuth` déjà employé par `server/routes/licencias.ts`. Les tables lues et écrites sont toutes qualifiées `e360.*` ; aucune table `public.*` de RLT n'est modifiée.

## Ce que tu auras à faire après mes modifications

- ⚙️ **Web Service** : un redéploiement manuel de l'API sur Render pour activer les chemins corrigés et `acceso`.
- 🖥️ **Site statique** : les étapes 6 à 10 doivent m'être demandées depuis l'onglet **E360 Insights** — je peux lire ce projet d'ici, mais pas y écrire.
