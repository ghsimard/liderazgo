# Guide de Migration : Supabase → Render (PostgreSQL + Express)

> Document généré le 25 février 2026 — Mis à jour le 8 mars 2026  
> Projet : RLT Ficha / Encuestas 360°

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Pré-requis sur Render](#2-pré-requis-sur-render)
3. [Étape 1 — Base de données](#3-étape-1--base-de-données)
4. [Étape 2 — Backend Express](#4-étape-2--backend-express)
5. [Étape 3 — Frontend React](#5-étape-3--frontend-react)
6. [Étape 4 — Images & Storage](#6-étape-4--images--storage)
7. [Étape 5 — Déploiement sur Render](#7-étape-5--déploiement-sur-render)
8. [Checklist finale](#8-checklist-finale)
9. [Annexe — Inventaire complet des fichiers](#9-annexe--inventaire-complet-des-fichiers)

---

## 1. Vue d'ensemble

### Architecture actuelle (Supabase)
```
Frontend React ──► Supabase JS SDK ──► Supabase (Auth + DB + Storage + Edge Functions)
```

### Architecture cible (Render)
```
Frontend React ──► fetch("/api/...") ──► Express (JWT + pg) ──► PostgreSQL Render
                                          └── /uploads/ (images statiques)
```

### Ce qui change

| Composant | Supabase | Render |
|---|---|---|
| Base de données | Supabase Postgres + RLS | PostgreSQL standard (pas de RLS) |
| Authentification | `supabase.auth.*` | JWT + bcrypt via Express |
| Autorisation | Policies RLS + `has_role()` | Middleware `requireAdmin()` |
| Storage (images) | Bucket `app-images` | Dossier `/uploads/` servi par Express |
| Edge Functions | `supabase.functions.invoke()` | Routes Express `/api/*` |
| Client SDK | `@supabase/supabase-js` | `fetch()` natif via `apiFetch` + `dbClient` |

---

## 2. Pré-requis sur Render

1. **Créer un PostgreSQL** sur Render (plan gratuit ou payant)
2. **Créer un Web Service** (Node.js) pointant vers le dossier `server/`
3. **Variables d'environnement** à configurer :

| Variable | Description | Exemple |
|---|---|---|
| `DATABASE_URL` | URL PostgreSQL fournie par Render | `postgresql://user:pass@host/db` |
| `JWT_SECRET` | Clé secrète pour signer les tokens (≥64 caractères) | `openssl rand -hex 32` |
| `PORT` | Port du serveur | `3001` |
| `UPLOAD_DIR` | Répertoire pour les fichiers uploadés | `./uploads` |
| `NODE_ENV` | Environnement | `production` |

---

## 3. Étape 1 — Base de données

### 3.1 Exporter depuis Supabase

1. Se connecter en admin sur l'application
2. Cliquer sur **Export SQL** dans le header admin
3. Le fichier `.sql` contient : tables + contraintes + données + infos utilisateurs

### 3.2 SQL exporté — déjà prêt pour PostgreSQL standard

Le fichier exporté via le bouton **Export SQL** de l'admin est **déjà compatible** avec un PostgreSQL standard :
- ✅ Aucune policy RLS incluse
- ✅ Aucune référence à `auth.uid()` ou `auth.users`
- ✅ Aucun `SECURITY DEFINER`
- ✅ Idempotent (`ON CONFLICT DO NOTHING`, `IF NOT EXISTS`)
- [ ] **Vérifier** que `gen_random_uuid()` fonctionne (PostgreSQL ≥ 13 = natif, sinon activer `uuid-ossp`)

> ⚠️ Si vous faites un `pg_dump` directement depuis la console Cloud au lieu d'utiliser le bouton Export, il faudra nettoyer manuellement les policies RLS et références `auth.*`.

### 3.3 Créer la table users

Exécuter `server/schema.sql` **avant** l'import des données. Ce fichier crée :
- `public.users` (remplace `auth.users`)
- `public.user_roles` (structure identique, FK vers `users` au lieu de `auth.users`)
- `public.app_images` (même structure)

### 3.4 Migrer les utilisateurs

Les mots de passe Supabase ne sont pas exportables. Il faut :

```bash
# Générer un hash bcrypt pour chaque utilisateur
node -e "require('bcryptjs').hash('MotDePasseTemporaire', 12).then(console.log)"
```

```sql
INSERT INTO users (id, email, password_hash) VALUES (
  'uuid-from-export', 'admin@example.com', '$2a$12$hash-generated-above'
);
INSERT INTO user_roles (user_id, role) VALUES ('uuid-from-export', 'admin');
```

### 3.5 Modifier la table user_roles

La FK actuelle pointe vers `auth.users`. Il faut la rediriger :

```sql
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
```

---

## 4. Étape 2 — Backend Express

### 4.1 Structure du serveur (✅ COMPLET)

```
server/
├── index.ts              ← Point d'entrée Express, enregistre toutes les routes
├── db.ts                 ← Pool PostgreSQL (query, queryOne)
├── middleware/
│   └── auth.ts           ← JWT verification + requireAuth + requireAdmin
├── routes/
│   ├── auth.ts           ← POST /api/auth/login, GET /api/auth/me
│   ├── users.ts          ← CRUD utilisateurs (admin only)
│   ├── images.ts         ← Upload/delete images app (admin only)
│   ├── db.ts             ← Proxy DB générique (GET/POST /api/db/:table)
│   ├── rpc.ts            ← Fonctions RPC (12 endpoints)
│   ├── export.ts         ← Export SQL complet (admin only)
│   ├── storage.ts        ← Upload/delete fichiers générique
│   ├── rubrica-analysis.ts ← Analyse IA rubriques (Grok)
│   ├── github.ts         ← Changelog GitHub commits
│   └── email.ts          ← Envoi d'emails (Resend)
├── schema.sql            ← Schéma complet (38+ tables + fonctions RPC)
└── package.json
```

### 4.2 Inventaire des routes Express

#### Authentification (`routes/auth.ts`)

| Route | Méthode | Auth | Description |
|---|---|---|---|
| `/api/auth/login` | POST | Public | Login email/password → JWT |
| `/api/auth/me` | GET | Auth | Retourne l'utilisateur courant |

#### Utilisateurs (`routes/users.ts`)

| Route | Méthode | Auth | Description |
|---|---|---|---|
| `/api/users` | GET | Admin | Liste tous les utilisateurs + rôles |
| `/api/users` | POST | Admin | Créer un utilisateur |
| `/api/users/:id/password` | PUT | Admin | Réinitialiser le mot de passe |
| `/api/users/:id` | DELETE | Admin | Supprimer un utilisateur |

#### Images app (`routes/images.ts`)

| Route | Méthode | Auth | Description |
|---|---|---|---|
| `/api/images` | GET | Public | Liste les mappings image_key → storage_path |
| `/api/images/:imageKey` | POST | Admin | Upload/remplacement d'une image |
| `/api/images/:imageKey` | DELETE | Admin | Supprimer une image (retour au fallback) |

#### Proxy DB générique (`routes/db.ts`) ⭐

Route unique qui remplace **tous** les appels `supabase.from("table").select/insert/update/delete()` du frontend. Le `dbClient.ts` côté frontend construit des requêtes que cette route traduit en SQL.

| Route | Méthode | Auth | Description |
|---|---|---|---|
| `/api/db/:table` | GET | Conditionnel | SELECT avec filtres, order, limit, range |
| `/api/db/:table` | POST | Conditionnel | INSERT, UPDATE, DELETE, UPSERT via `_method` |

**Tables en lecture publique** (GET sans auth) :
`domains_360`, `competencies_360`, `competency_weights`, `items_360`, `item_texts_360`, `entidades_territoriales`, `municipios`, `instituciones`, `regiones`, `region_municipios`, `region_instituciones`, `app_images`, `app_settings`, `rubrica_submission_dates`, `rubrica_modules`, `rubrica_items`, `rubrica_evaluadores`, `rubrica_asignaciones`, `rubrica_evaluaciones`, `rubrica_seguimientos`, `encuesta_invitaciones`, `mel_kpi_config`, `mel_kpi_groups`, `mel_kpi_group_items`, `informe_modulo`, `informe_modulo_equipo`, `informe_directivo`, `informe_asistencia`, `satisfaccion_config`, `satisfaccion_responses`, `encuestas_ambiente_escolar`

**Tables en insertion publique** (POST sans auth) :
`fichas_rlt`, `encuestas_360`, `rubrica_submission_dates`, `rubrica_evaluaciones`, `rubrica_seguimientos`, `site_reviews`, `contact_messages`, `encuesta_invitaciones`, `user_activity_log`, `informe_modulo`, `informe_modulo_equipo`, `informe_directivo`, `informe_asistencia`, `encuestas_ambiente_escolar`, `satisfaccion_responses`

**Toutes les autres opérations** (UPDATE, DELETE, écriture sur tables non-publiques) : **admin requis**.

Filtres supportés : `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `in`, `is`, `or`
Options supportées : `select`, `order`, `limit`, `range(from,to)`, `single`, `head`, `count`

#### Fonctions RPC (`routes/rpc.ts`)

| Route | Méthode | Auth | Description |
|---|---|---|---|
| `/api/rpc/get_instituciones_con_ficha` | GET | Public | Institutions ayant au moins une fiche |
| `/api/rpc/get_directivos_por_institucion` | GET | Public | Directifs d'une institution (param: `p_nombre_ie`) |
| `/api/rpc/get_table_columns` | GET | Public | Colonnes d'une table (param: `table_names`) |
| `/api/rpc/get_table_constraints` | GET | Public | Contraintes d'une table (param: `table_names`) |
| `/api/rpc/get_enum_types` | GET | Public | Types enum de la DB |
| `/api/rpc/check_cedula_exists` | GET | Public | Vérifie si une cédula existe dans fichas_rlt |
| `/api/rpc/check_cedula_role` | GET | Public | Détection de rôle par cédula (landing page) |
| `/api/rpc/get_ficha_by_cedula` | GET | Public | Récupère la fiche complète par cédula |
| `/api/rpc/get_invitation_by_token` | GET | Public | Récupère une invitation par token UUID |
| `/api/rpc/get_invitaciones_directivo` | GET | Public | Liste les invitations d'un directivo |
| `/api/rpc/get_own_autoevaluacion` | GET | Public | Récupère l'autoévaluation d'un directivo |
| `/api/rpc/instituciones-ficha` | GET | Public | Alias pour Encuesta360Form |
| `/api/rpc/directivos` | GET | Public | Alias pour Encuesta360Form |

#### Export (`routes/export.ts`)

| Route | Méthode | Auth | Description |
|---|---|---|---|
| `/api/export` | GET | SuperAdmin | Export SQL complet (38+ tables + users + fichiers base64) |

#### Analyse IA Rubriques (`routes/rubrica-analysis.ts`)

| Route | Méthode | Auth | Description |
|---|---|---|---|
| `/api/rubrica-analysis` | POST | Admin | Génération d'analyse IA via Grok-3 |

#### GitHub (`routes/github.ts`)

| Route | Méthode | Auth | Description |
|---|---|---|---|
| `/api/github/commits` | GET | Admin | Changelog des commits récents |

#### Email (`routes/email.ts`)

| Route | Méthode | Auth | Description |
|---|---|---|---|
| `/api/email/send` | POST | Admin | Envoi d'email via Resend |

#### Storage générique (`routes/storage.ts`)

| Route | Méthode | Auth | Description |
|---|---|---|---|
| `/api/storage/:bucket/*` | POST | Admin | Upload d'un fichier |
| `/api/storage/:bucket` | DELETE | Admin | Suppression de fichiers par paths |

---

## 5. Étape 3 — Frontend React (✅ COMPLET)

### 5.1 Utilitaires créés

| Fichier | Rôle |
|---|---|
| `src/utils/apiFetch.ts` | Wrapper `fetch()` avec injection JWT, gestion FormData, auto-logout sur 401 |
| `src/utils/dbClient.ts` | Couche de compatibilité Supabase : `QueryBuilder` qui imite `.from().select().eq()...` et traduit en appels REST vers `/api/db/:table` |

### 5.2 Fichiers frontend migrés (24 fichiers)

Tous les imports `@/integrations/supabase/client` ont été remplacés par `@/utils/dbClient` ou `@/utils/apiFetch`.

#### Authentification (3 fichiers)
| Fichier | Statut |
|---|---|
| `src/pages/AdminLogin.tsx` | ✅ Migré → `apiLogin()` |
| `src/pages/AdminPage.tsx` | ✅ Migré → `apiFetch("/api/export")` |
| `src/hooks/useAdminAuth.ts` | ✅ Migré → `apiGetMe()` |

#### Admin — Gestion des données (12 fichiers)
| Fichier | Statut |
|---|---|
| `src/components/admin/AdminFichasTab.tsx` | ✅ Migré → `dbClient` |
| `src/components/admin/AdminEncuestas360Tab.tsx` | ✅ Migré → `dbClient` |
| `src/components/admin/AdminGeographyTab.tsx` | ✅ Migré → `dbClient` |
| `src/components/admin/AdminCompetenciesManager.tsx` | ✅ Migré → `dbClient` |
| `src/components/admin/AdminCompetencyWizard.tsx` | ✅ Migré → `dbClient` |
| `src/components/admin/AdminItemsManager.tsx` | ✅ Migré → `dbClient` |
| `src/components/admin/AdminWeightsTab.tsx` | ✅ Migré → `dbClient` |
| `src/components/admin/AdminDomainsManager.tsx` | ✅ Migré → `dbClient` |
| `src/components/admin/AdminTrashManager.tsx` | ✅ Migré → `dbClient` |
| `src/components/admin/AdminUsersTab.tsx` | ✅ Migré → `dbClient` |
| `src/components/admin/AdminImagesTab.tsx` | ✅ Migré → `dbClient` |
| `src/components/admin/AdminReporte360Tab.tsx` | ✅ Migré → `dbClient` |
| `src/components/admin/AdminEncuestaMonitor.tsx` | ✅ Migré → `dbClient` |

#### Formulaires publics & hooks (5 fichiers)
| Fichier | Statut |
|---|---|
| `src/pages/FichaRLT.tsx` | ✅ Migré → `apiFetch` direct |
| `src/components/Encuesta360Form.tsx` | ✅ Migré → `apiFetch` direct |
| `src/hooks/useAppImages.ts` | ✅ Migré → `apiFetch` direct |
| `src/hooks/useGeographicData.ts` | ✅ Migré → `apiFetch` direct |
| `src/pages/AdminEditFicha.tsx` | ✅ Migré → `dbClient` |

#### Données & Utilitaires (2 fichiers)
| Fichier | Statut |
|---|---|
| `src/data/encuesta360Data.ts` | ✅ Migré → `dbClient` (import dynamique) |
| `src/utils/reporte360Calculator.ts` | ✅ Migré → `dbClient` |

### 5.3 Dépendances à supprimer (lors du déploiement final)

```bash
npm uninstall @supabase/supabase-js
```

### 5.4 Fichiers à supprimer (lors du déploiement final)

```
src/integrations/supabase/client.ts
src/integrations/supabase/types.ts
supabase/config.toml
supabase/functions/create-user/index.ts
supabase/functions/manage-users/index.ts
supabase/functions/export-database/index.ts
.env (remplacer par les nouvelles variables)
```

### 5.5 Variables d'environnement frontend

Remplacer dans `.env` :
```diff
- VITE_SUPABASE_URL=...
- VITE_SUPABASE_PUBLISHABLE_KEY=...
+ VITE_API_URL=https://votre-app.onrender.com
```

En développement local, laisser `VITE_API_URL` vide (même origine si proxy Vite).

---

## 6. Étape 4 — Images & Storage

### 6.1 Télécharger les images actuelles

Depuis l'export SQL ou directement depuis les URLs dans `app_images.storage_path` :

```bash
mkdir -p server/uploads
curl -o server/uploads/logo_rlt.png "https://krqx...supabase.co/storage/v1/object/public/app-images/logo_rlt.png"
# ... répéter pour chaque image
```

### 6.2 Mettre à jour la DB

```sql
UPDATE app_images SET storage_path = '/uploads/logo_rlt.png' WHERE image_key = 'logo_rlt';
UPDATE app_images SET storage_path = '/uploads/logo_rlt_white.jpeg' WHERE image_key = 'logo_rlt_white';
-- ... pour chaque image
```

### 6.3 Fallbacks statiques

Les images par défaut restent dans `public/images/` du frontend React. Elles sont utilisées quand aucune entrée n'existe dans `app_images`.

---

## 7. Étape 5 — Déploiement sur Render

### 7.1 Option recommandée : Tout-en-un (Express sert le frontend)

Le serveur Express est déjà configuré pour servir le build React depuis `../dist/` et router toutes les URLs non-API vers `index.html` (SPA fallback).

**Render Web Service :**

| Paramètre | Valeur |
|---|---|
| **Root Directory** | `/` (racine du repo) |
| **Build Command** | `npm install && npm run build && cd server && npm install && npx tsc` |
| **Start Command** | `cd server && node dist/index.js` |
| **Disk Mount** | `/uploads` → disque persistant (pour conserver les images) |

### 7.2 Option alternative : Séparé (Static Site + Web Service)

**Static Site (frontend)** :
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`

**Web Service (backend)** :
- Root Directory: `server/`
- Build Command: `npm install && npx tsc`
- Start Command: `node dist/index.js`

### 7.3 Dépendances serveur (`server/package.json`)

Vérifier que ces dépendances sont présentes :

```json
{
  "dependencies": {
    "express": "^4.21.0",
    "cors": "^2.8.5",
    "pg": "^8.13.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "dotenv": "^16.4.5",
    "uuid": "^11.1.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/cors": "^2.8.17",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.9",
    "@types/multer": "^1.4.12",
    "@types/pg": "^8.11.11",
    "@types/uuid": "^10.0.0",
    "typescript": "^5.7.0"
  }
}
```

### 7.4 Configuration TypeScript serveur (`server/tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "skipLibCheck": true
  },
  "include": ["**/*.ts"],
  "exclude": ["dist", "node_modules"]
}
```

---

## 8. Checklist finale

### Base de données
- [ ] PostgreSQL créé sur Render
- [ ] `server/schema.sql` exécuté (tables `users`, `user_roles`, `app_images`, `mel_kpi_*`, `informe_*`, `satisfaccion_*`, `encuestas_ambiente_escolar`, fonctions RPC)
- [ ] Export SQL importé (38+ tables métier)
- [ ] FK `user_roles` redirigée vers `public.users`
- [ ] Utilisateurs admin créés avec mots de passe bcrypt
- [ ] RLS policies supprimées du script
- [ ] `gen_random_uuid()` fonctionne

### Backend Express
- [x] `routes/auth.ts` — Login + /me
- [x] `routes/users.ts` — CRUD utilisateurs (admin)
- [x] `routes/images.ts` — Upload/delete images app
- [x] `routes/db.ts` — Proxy DB générique (toutes les tables)
- [x] `routes/rpc.ts` — 12 fonctions RPC
- [x] `routes/export.ts` — Export SQL complet (35+ tables)
- [x] `routes/storage.ts` — Upload/delete fichiers
- [x] `routes/rubrica-analysis.ts` — Analyse IA (Grok)
- [x] `routes/github.ts` — Changelog GitHub
- [x] `routes/email.ts` — Envoi emails (Resend)
- [ ] JWT_SECRET configuré (≥64 chars)
- [ ] CORS configuré pour le domaine frontend

### Frontend React
- [x] `apiFetch.ts` créé (wrapper fetch + JWT)
- [x] `dbClient.ts` créé (compatibilité QueryBuilder Supabase)
- [x] 24 fichiers migrés (0 référence résiduelle à `@/integrations/supabase/client`)
- [ ] `@supabase/supabase-js` désinstallé
- [ ] `src/integrations/supabase/` supprimé
- [ ] `supabase/` supprimé
- [x] Login stocke le JWT dans localStorage
- [x] Logout supprime le JWT

### Images
- [ ] Images téléchargées depuis le bucket Supabase
- [ ] Placées dans `server/uploads/`
- [ ] `app_images.storage_path` mis à jour en DB
- [ ] Disque persistant monté sur Render

### Tests fonctionnels
- [ ] Login/logout admin fonctionne
- [ ] CRUD fichas (admin) fonctionne
- [ ] Soumission ficha publique fonctionne
- [ ] Soumission encuesta 360° publique fonctionne
- [ ] Upload d'image admin fonctionne
- [ ] Export SQL fonctionne
- [ ] Rapport 360° PDF fonctionne
- [ ] Gestion géographique fonctionne
- [ ] Gestion Config 360° (domaines, compétences, items, poids) fonctionne
- [ ] Corbeille (suppression, restauration, purge) fonctionne

---

## 10. Colonne `fase` sur `encuestas_360`

La table `encuestas_360` dispose d'une colonne `fase` (type `TEXT`, défaut `'inicial'`) qui distingue les évaluations initiales des évaluations finales du programme de formation. Les valeurs possibles sont :

- `'inicial'` — Évaluation de départ (début du programme)
- `'final'` — Évaluation de fin (après le programme de formation)

Cette colonne est utilisée pour :
1. Filtrer les encuestas par phase dans le panneau d'administration
2. Calculer les rapports 360° par phase
3. Générer les analyses comparatives MEL (Monitoring, Evaluation & Learning)

**Migration Render** : La colonne est ajoutée automatiquement par `schema.sql` via `ADD COLUMN IF NOT EXISTS`.

### Routes formulaires finales

| Route | Description |
|---|---|
| `/formulario-360-final-acudiente` | Encuesta 360° final — Acudiente |
| `/formulario-360-final-administrativo` | Encuesta 360° final — Administrativo |
| `/formulario-360-final-autoevaluacion` | Encuesta 360° final — Autoevaluación |
| `/formulario-360-final-directivo` | Encuesta 360° final — Directivo |
| `/formulario-360-final-docente` | Encuesta 360° final — Docente |
| `/formulario-360-final-estudiante` | Encuesta 360° final — Estudiante |

Ces formulaires réutilisent le composant `Encuesta360Form` avec la prop `fase="final"`.

---

## 9. Annexe — Inventaire complet des fichiers

### Fichiers BACKEND créés (✅ tous terminés)

```
server/
├── index.ts                  ← Point d'entrée (enregistre 10 groupes de routes)
├── db.ts                     ← Pool pg + helpers query/queryOne
├── schema.sql                ← Schéma complet (38+ tables + fonctions RPC)
├── seed.sql                  ← Données de référence (360°, géographie, settings)
├── seed-rubricas.sql         ← Données de seed pour les rubriques
├── create-admin.js           ← Script de création admin sécurisé
├── middleware/
│   └── auth.ts               ← signToken, requireAuth, requireAdmin, requireSuperAdmin
└── routes/
    ├── auth.ts               ← POST /login, GET /me
    ├── users.ts              ← GET/POST/PUT/DELETE utilisateurs
    ├── images.ts             ← GET/POST/DELETE images app
    ├── db.ts                 ← GET/POST /api/db/:table (proxy générique)
    ├── rpc.ts                ← GET /api/rpc/:function (12 fonctions)
    ├── export.ts             ← GET /api/export (dump SQL)
    ├── storage.ts            ← POST/DELETE /api/storage/:bucket
    ├── rubrica-analysis.ts   ← POST /api/rubrica-analysis (IA Grok)
    ├── github.ts             ← GET /api/github/commits (changelog)
    └── email.ts              ← POST /api/email/send (Resend)
```

### Fichiers FRONTEND migrés (✅ 37/37)

```
src/utils/apiFetch.ts                           ← CRÉÉ — wrapper fetch centralisé
src/utils/dbClient.ts                           ← CRÉÉ — shim compatibilité Supabase
src/utils/melRubricaCalculator.ts               ← MIGRÉ — calcul dynamique KPIs MEL
src/utils/melRubricaPdfGenerator.ts             ← MIGRÉ
src/utils/melGlobalPdfGenerator.ts              ← MIGRÉ
src/utils/reporte360Calculator.ts               ← MIGRÉ
src/utils/reporte360MelCalculator.ts            ← MIGRÉ
src/pages/AdminLogin.tsx                        ← MIGRÉ
src/pages/AdminPage.tsx                         ← MIGRÉ
src/pages/AdminEditFicha.tsx                    ← MIGRÉ
src/pages/FichaRLT.tsx                          ← MIGRÉ
src/pages/MiPanel.tsx                           ← MIGRÉ
src/hooks/useAdminAuth.ts                       ← MIGRÉ
src/hooks/useAppImages.ts                       ← MIGRÉ
src/hooks/useGeographicData.ts                  ← MIGRÉ
src/components/Encuesta360Form.tsx              ← MIGRÉ
src/components/AmbienteEscolarForm.tsx          ← MIGRÉ
src/components/SatisfaccionPage.tsx             ← MIGRÉ
src/components/admin/AdminFichasTab.tsx          ← MIGRÉ
src/components/admin/AdminEncuestas360Tab.tsx     ← MIGRÉ
src/components/admin/AdminEncuestaMonitor.tsx     ← MIGRÉ
src/components/admin/AdminGeographyTab.tsx        ← MIGRÉ
src/components/admin/AdminCompetenciesManager.tsx ← MIGRÉ
src/components/admin/AdminCompetencyWizard.tsx    ← MIGRÉ
src/components/admin/AdminItemsManager.tsx        ← MIGRÉ
src/components/admin/AdminWeightsTab.tsx          ← MIGRÉ
src/components/admin/AdminDomainsManager.tsx      ← MIGRÉ
src/components/admin/AdminTrashManager.tsx        ← MIGRÉ
src/components/admin/AdminUsersTab.tsx            ← MIGRÉ
src/components/admin/AdminImagesTab.tsx           ← MIGRÉ
src/components/admin/AdminReporte360Tab.tsx        ← MIGRÉ
src/components/admin/AdminSatisfaccionesTab.tsx   ← MIGRÉ
src/components/admin/AdminSatisfaccionStats.tsx   ← MIGRÉ
src/components/admin/AdminMelTab.tsx              ← MIGRÉ
src/components/admin/AdminMelRubricasTab.tsx      ← MIGRÉ
src/components/admin/AdminMelConfigTab.tsx        ← MIGRÉ — config KPIs + groupes
src/components/admin/AdminMelKpiGroupsManager.tsx ← CRÉÉ — gestion groupes KPI régionaux
src/data/encuesta360Data.ts                      ← MIGRÉ
```

### Fichiers à SUPPRIMER (lors du déploiement final)

```
src/integrations/supabase/client.ts
src/integrations/supabase/types.ts
supabase/config.toml
supabase/functions/create-user/index.ts
supabase/functions/manage-users/index.ts
supabase/functions/export-database/index.ts
```

---

## Estimation de l'effort restant

| Phase | Effort estimé | Statut |
|---|---|---|
| DB : export + nettoyage + import | 2-3 heures | ⏳ À faire |
| Backend : routes Express (7 fichiers) | 4-6 heures | ✅ Terminé |
| Frontend : migration 24 fichiers | 6-8 heures | ✅ Terminé |
| Images : téléchargement + mise à jour DB | 1 heure | ⏳ À faire |
| Render : configuration + déploiement | 1-2 heures | ⏳ À faire |
| Tests & debug | 3-4 heures | ⏳ À faire |
| **Total restant** | **~7-10 heures** | |
