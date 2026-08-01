# Audit du projet e360 (E360 Insights) + corrections

Accès en lecture au projet **E360 Insights** confirmé depuis ce projet — aucun Git à configurer, rien n'est perdu ici.

## Ce qui est bien fait

- **Isolation des données : correcte.** Toutes les requêtes de `server/e360Routes.js` ciblent exclusivement le schéma `e360` (`licencias`, `licencias_tarifas`, `licencias_transacciones`, `licencias_contrato`, `encuestas_360`, vues `v_360_*`). Aucune écriture dans les tables `public` de RLT : rien de ce qui est saisi sur le nouveau site n'apparaîtra dans le site actuel.
- **Architecture / dbClient : conforme.** `src/lib/dbClient.ts` est l'unique point d'accès, aucun client Supabase côté navigateur, `VITE_API_URL` correctement défini sur `https://liderazgo-api.onrender.com`, gestion d'erreurs propre (`ApiError`, détection de réponse HTML).
- Structure de routes claire (`/`, `/encuesta`, `/reporte`, `/admin`), UI en espagnol, métadonnées SEO présentes.

## Problèmes trouvés (bloquants)

1. **Chemins d'API décalés — la soumission et le rapport ne peuvent pas fonctionner.**
   Le frontend appelle `/api/e360app/respuestas` et `/api/e360app/reportes/:cedula`, alors que le serveur expose `/e360/respuestas` et `/e360/reportes/:cedula` sous le préfixe `/api/e360app` (donc `/api/e360app/e360/...`). Idem pour `/estructura`.
2. **Endpoint d'accès inexistant.** Le frontend appelle `POST /api/e360app/licencias/acceso` ; cette route n'existe pas côté serveur. Le code retombe silencieusement sur `verificar`, donc un recteur sans licence pré-créée ne peut jamais entrer.
3. **Aucune authentification réelle.** La session est un simple objet `localStorage` contenant `esAdministrador`. Les routes d'administration (`GET/POST /licencias`, `/tarifas`, `PUT /contrato`, `/transacciones`) sont ouvertes sans jeton : n'importe qui peut lister les licences ou modifier les tarifs. Bloquant avant toute vente de licences.
4. **Contenu de l'encuesta inventé.** `src/lib/e360-content.ts` contient un modèle générique d'entreprise (Autoconocimiento, Autorregulación… ; relations jefe / par / colaborador / cliente) au lieu du modèle réel RLT (Autoconciencia, Manejo de emociones, Comunicación asertiva… et rôles Directivo par / Docente / Administrativo / Acudiente / Estudiante). Les pondérations par rôle ne sont pas utilisées non plus, alors que la route `/estructura` les expose déjà depuis la base.

## Corrections proposées

### ⚙️ Web Service (Express, ce projet)
- Renommer les routes en `/licencias/...`, `/respuestas`, `/reportes/:cedula`, `/estructura` (sans le double `e360/`) pour coller au contrat du frontend.
- Ajouter `POST /licencias/acceso` : recherche par cédula, création/activation d'une licence `rector` si un siège reste disponible dans `licencias_contrato`, écriture dans `licencias_transacciones`.
- Ajouter un middleware d'authentification sur les routes d'administration (jeton signé émis à l'accès, rôle vérifié côté serveur — jamais depuis le `localStorage`).
- Redéploiement du Web Service après ces changements.

### 🖥️ Site statique (projet E360 Insights — à appliquer là-bas)
- Remplacer `e360-content.ts` par un chargement de la structure réelle via `GET /estructura` (3 dominios / 13 competencias / 39 ítems), avec les vrais libellés et les rôles observateurs RLT.
- Stocker le jeton renvoyé par `/licencias/acceso` et l'envoyer sur toutes les requêtes ; ne plus se fier à `esAdministrador` en local pour l'affichage seul.
- Ajuster les chemins `api.*` si le renommage serveur diffère de ce qui est prévu ici.

### 🗄️ Base de données
- Rien à changer : le schéma `e360` créé en production couvre tous les besoins ci-dessus.

## Ordre d'exécution

1. Corrections serveur (ce projet) + redéploiement du Web Service.
2. Corrections frontend, à me demander depuis l'onglet **E360 Insights** (je ne peux qu'y lire depuis ici).
3. Test bout en bout : accès par cédula → encuesta 39 ítems → reporte → panel superadmin.
