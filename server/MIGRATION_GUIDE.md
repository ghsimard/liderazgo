# Guide de Migration : Supabase → Render (PostgreSQL + Express)

> Document généré le 25 février 2026  
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
9. [Annexe — Inventaire des fichiers à modifier](#9-annexe--inventaire-des-fichiers-à-modifier)

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
| Client SDK | `@supabase/supabase-js` | `fetch()` natif via utilitaire `apiFetch` |

---

## 2. Pré-requis sur Render

1. **Créer un PostgreSQL** sur Render (plan gratuit ou payant)
2. **Créer un Web Service** (Node.js) pointant vers le dossier `server/`
3. **Variables d'environnement** à configurer :

| Variable | Description |
|---|---|
| `DATABASE_URL` | URL PostgreSQL fournie par Render |
| `JWT_SECRET` | Clé secrète pour signer les tokens (≥64 caractères) |
| `PORT` | `3001` (ou celui de Render) |
| `UPLOAD_DIR` | `./uploads` |
| `NODE_ENV` | `production` |

---

## 3. Étape 1 — Base de données

### 3.1 Exporter depuis Supabase

1. Se connecter en admin sur l'application
2. Cliquer sur **Export SQL** dans le header admin
3. Le fichier `.sql` contient : tables + contraintes + données + infos utilisateurs

### 3.2 Nettoyer le SQL exporté

Le script exporté est déjà idempotent (`DROP CONSTRAINT IF EXISTS`, `ON CONFLICT DO NOTHING`). Cependant, il faut :

- [ ] **Supprimer** les politiques RLS (pas de RLS sur PostgreSQL standard)
- [ ] **Supprimer** les références à `auth.uid()` et `auth.users`
- [ ] **Adapter** la fonction `has_role()` : retirer `SECURITY DEFINER` et `SET search_path`
- [ ] **Vérifier** que `gen_random_uuid()` fonctionne (PostgreSQL ≥ 13 = natif, sinon activer `uuid-ossp`)

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
-- Supprimer l'ancienne FK (si importée)
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
-- Créer la nouvelle FK
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
```

---

## 4. Étape 2 — Backend Express

Le backend est déjà créé dans `server/`. Structure :

```
server/
├── index.ts              ← Point d'entrée Express
├── db.ts                 ← Pool PostgreSQL
├── middleware/auth.ts     ← JWT + requireAuth + requireAdmin
├── routes/
│   ├── auth.ts           ← POST /api/auth/login, GET /api/auth/me
│   ├── users.ts          ← CRUD utilisateurs (admin only)
│   └── images.ts         ← Upload/delete images (admin only)
├── schema.sql            ← Schéma SQL pour users
└── package.json
```

### 4.1 Routes métier à ajouter

Les routes suivantes doivent être créées pour remplacer les appels `supabase.from(...)` :

| Route | Méthode | Auth | Remplace |
|---|---|---|---|
| `/api/fichas` | GET | Admin | `supabase.from("fichas_rlt").select()` |
| `/api/fichas` | POST | Public | `supabase.from("fichas_rlt").insert()` |
| `/api/fichas/:id` | PUT | Admin | `supabase.from("fichas_rlt").update()` |
| `/api/fichas/:id` | DELETE | Admin | `supabase.from("fichas_rlt").delete()` |
| `/api/encuestas` | GET | Admin | `supabase.from("encuestas_360").select()` |
| `/api/encuestas` | POST | Public | `supabase.from("encuestas_360").insert()` |
| `/api/encuestas/:id` | DELETE | Admin | `supabase.from("encuestas_360").delete()` |
| `/api/geography/entidades` | GET | Public | `supabase.from("entidades_territoriales").select()` |
| `/api/geography/regiones` | GET | Public | `supabase.from("regiones").select()` |
| `/api/geography/municipios` | GET | Public | `supabase.from("municipios").select()` |
| `/api/geography/instituciones` | GET | Public | `supabase.from("instituciones").select()` |
| `/api/geography/*` | POST/PUT/DELETE | Admin | CRUD géographie |
| `/api/config/domains` | GET | Public | `supabase.from("domains_360").select()` |
| `/api/config/competencies` | GET | Public | `supabase.from("competencies_360").select()` |
| `/api/config/items` | GET | Public | `supabase.from("items_360").select()` |
| `/api/config/item-texts` | GET | Public | `supabase.from("item_texts_360").select()` |
| `/api/config/weights` | GET/PUT | Public/Admin | Poids des compétences |
| `/api/config/*` | POST/PUT/DELETE | Admin | CRUD config 360° |
| `/api/trash` | GET | Admin | `supabase.from("deleted_records").select()` |
| `/api/trash/:id/restore` | POST | Admin | Restauration |
| `/api/trash/:id` | DELETE | Admin | Suppression définitive |
| `/api/rpc/directivos` | GET | Public | `supabase.rpc("get_directivos_por_institucion")` |
| `/api/rpc/instituciones-ficha` | GET | Public | `supabase.rpc("get_instituciones_con_ficha")` |
| `/api/export` | GET | Admin | Edge Function `export-database` |

---

## 5. Étape 3 — Frontend React

### 5.1 Créer l'utilitaire `apiFetch`

Remplacer **tous** les appels `supabase.from(...)` par un utilitaire centralisé :

```typescript
// src/utils/apiFetch.ts
const API_BASE = import.meta.env.VITE_API_URL || "";

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  const token = localStorage.getItem("auth_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const body = await res.json();
    if (!res.ok) return { data: null, error: body.error || res.statusText };
    return { data: body, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}
```

### 5.2 Fichiers frontend à modifier (20 fichiers)

#### Authentification (3 fichiers)
| Fichier | Changement |
|---|---|
| `src/pages/AdminLogin.tsx` | `supabase.auth.signInWithPassword()` → `apiFetch("/api/auth/login", { method: "POST", body })` + stocker le token dans `localStorage` |
| `src/pages/AdminPage.tsx` | `supabase.auth.getSession()` → `apiFetch("/api/auth/me")` ; `supabase.auth.signOut()` → `localStorage.removeItem("auth_token")` |
| `src/hooks/useAdminAuth.ts` | `supabase.auth.onAuthStateChange()` → vérifier le token JWT au montage via `/api/auth/me` |

#### Admin — Gestion des données (8 fichiers)
| Fichier | Nb appels Supabase | Changement |
|---|---|---|
| `src/components/admin/AdminFichasTab.tsx` | ~10 | `.from("fichas_rlt")` → `apiFetch("/api/fichas")` |
| `src/components/admin/AdminEncuestas360Tab.tsx` | ~8 | `.from("encuestas_360")` → `apiFetch("/api/encuestas")` |
| `src/components/admin/AdminGeographyTab.tsx` | ~15 | `.from("entidades/regiones/municipios/instituciones")` → `apiFetch("/api/geography/*")` |
| `src/components/admin/AdminCompetenciesManager.tsx` | ~12 | `.from("competencies_360/domains_360")` → `apiFetch("/api/config/*")` |
| `src/components/admin/AdminItemsManager.tsx` | ~15 | `.from("items_360/item_texts_360")` → `apiFetch("/api/config/*")` |
| `src/components/admin/AdminWeightsTab.tsx` | ~5 | `.from("competency_weights")` → `apiFetch("/api/config/weights")` |
| `src/components/admin/AdminDomainsManager.tsx` | ~8 | `.from("domains_360")` → `apiFetch("/api/config/domains")` |
| `src/components/admin/AdminTrashManager.tsx` | ~5 | `.from("deleted_records")` → `apiFetch("/api/trash")` |

#### Admin — Utilisateurs & Images (3 fichiers)
| Fichier | Changement |
|---|---|
| `src/components/admin/AdminUsersTab.tsx` | `supabase.functions.invoke("manage-users")` → `apiFetch("/api/users")` |
| `src/components/admin/AdminImagesTab.tsx` | `supabase.storage.upload()` → `fetch("/api/images/:key", { body: FormData })` |
| `src/components/admin/AdminReporte360Tab.tsx` | Appels `.from()` → `apiFetch()` |

#### Formulaires publics (4 fichiers)
| Fichier | Changement |
|---|---|
| `src/pages/FichaRLT.tsx` | `supabase.from("fichas_rlt").insert()` → `apiFetch("/api/fichas", { method: "POST" })` |
| `src/components/Encuesta360Form.tsx` | `supabase.from("encuestas_360").insert()` → `apiFetch("/api/encuestas", { method: "POST" })` |
| `src/data/encuesta360Data.ts` | `supabase.from("items_360/item_texts_360").select()` → `apiFetch("/api/config/items")` |
| `src/data/instituciones.ts` | `supabase.rpc()` → `apiFetch("/api/rpc/...")` |

#### Hooks & Utilitaires (3 fichiers)
| Fichier | Changement |
|---|---|
| `src/hooks/useAppImages.ts` | `supabase.from("app_images").select()` → `apiFetch("/api/images")` |
| `src/hooks/useGeographicData.ts` | `supabase.from("regiones/municipios/instituciones").select()` → `apiFetch("/api/geography/*")` |
| `src/utils/reporte360Calculator.ts` | ~5 appels `.from()` → `apiFetch("/api/...")` |

### 5.3 Dépendances à supprimer

```bash
npm uninstall @supabase/supabase-js
```

### 5.4 Fichiers à supprimer

```
src/integrations/supabase/client.ts    ← SDK client
src/integrations/supabase/types.ts     ← Types générés
supabase/                              ← Tout le dossier (config, migrations, edge functions)
```

### 5.5 Variable d'environnement

Remplacer dans `.env` :
```diff
- VITE_SUPABASE_URL=...
- VITE_SUPABASE_PUBLISHABLE_KEY=...
+ VITE_API_URL=https://votre-app.onrender.com
```

En développement local, laisser `VITE_API_URL` vide (proxy Vite ou même origine).

---

## 6. Étape 4 — Images & Storage

### 6.1 Télécharger les images actuelles

Depuis l'export SQL ou directement depuis les URLs dans `app_images.storage_path` :

```bash
mkdir -p server/uploads
# Pour chaque image listée dans app_images :
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

Les images par défaut (fallback) restent dans `public/images/` du frontend React. Elles sont utilisées quand aucune entrée n'existe dans `app_images`.

---

## 7. Étape 5 — Déploiement sur Render

### 7.1 Structure du repo

```
/
├── server/               ← Backend Express (Web Service Render)
│   ├── index.ts
│   ├── package.json
│   └── uploads/          ← Images uploadées
├── src/                  ← Frontend React
├── public/
├── package.json          ← Frontend
└── vite.config.ts
```

### 7.2 Configuration Render

**Web Service (backend)** :
- Build Command: `cd server && npm install && npm run build`
- Start Command: `cd server && npm start`
- Disk: Monter un disque persistant sur `/uploads` (pour conserver les images uploadées)

**Static Site (frontend)** — ou servir via Express :
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`

**Alternative** : Tout-en-un avec Express servant le frontend (déjà configuré dans `server/index.ts`).

### 7.3 Build Command tout-en-un

```bash
npm install && npm run build && cd server && npm install && npm run build
```

Start Command :
```bash
cd server && npm start
```

---

## 8. Checklist finale

### Base de données
- [ ] PostgreSQL créé sur Render
- [ ] `server/schema.sql` exécuté (table `users`)
- [ ] Export SQL importé (15 tables métier)
- [ ] FK `user_roles` redirigée vers `public.users`
- [ ] Utilisateurs admin créés avec mots de passe bcrypt
- [ ] RLS policies supprimées du script
- [ ] `gen_random_uuid()` fonctionne

### Backend Express
- [ ] Routes auth fonctionnelles (`/api/auth/login`, `/api/auth/me`)
- [ ] Routes users fonctionnelles (CRUD admin)
- [ ] Routes images fonctionnelles (upload/delete)
- [ ] **Routes métier ajoutées** (fichas, encuestas, geography, config 360°, trash, RPC, export)
- [ ] JWT_SECRET configuré (≥64 chars)
- [ ] CORS configuré pour le domaine frontend

### Frontend React
- [ ] `apiFetch` utilitaire créé
- [ ] 20 fichiers migrés (supabase → apiFetch)
- [ ] `@supabase/supabase-js` désinstallé
- [ ] `src/integrations/supabase/` supprimé
- [ ] `supabase/` supprimé
- [ ] Login stocke le JWT dans localStorage
- [ ] Logout supprime le JWT

### Images
- [ ] Images téléchargées depuis le bucket
- [ ] Placées dans `server/uploads/`
- [ ] `app_images.storage_path` mis à jour en DB
- [ ] Disque persistant monté sur Render

### Tests
- [ ] Login/logout admin fonctionne
- [ ] CRUD fichas (admin) fonctionne
- [ ] Soumission ficha publique fonctionne
- [ ] Soumission encuesta 360° publique fonctionne
- [ ] Upload d'image admin fonctionne
- [ ] Export SQL fonctionne
- [ ] Rapport 360° PDF fonctionne
- [ ] Gestion géographique fonctionne

---

## 9. Annexe — Inventaire des fichiers à modifier

### Fichiers à MODIFIER (20 fichiers frontend)

```
src/pages/AdminLogin.tsx
src/pages/AdminPage.tsx
src/pages/FichaRLT.tsx
src/hooks/useAdminAuth.ts
src/hooks/useAppImages.ts
src/hooks/useGeographicData.ts
src/components/Encuesta360Form.tsx
src/components/admin/AdminFichasTab.tsx
src/components/admin/AdminEncuestas360Tab.tsx
src/components/admin/AdminGeographyTab.tsx
src/components/admin/AdminCompetenciesManager.tsx
src/components/admin/AdminItemsManager.tsx
src/components/admin/AdminWeightsTab.tsx
src/components/admin/AdminDomainsManager.tsx
src/components/admin/AdminTrashManager.tsx
src/components/admin/AdminUsersTab.tsx
src/components/admin/AdminImagesTab.tsx
src/components/admin/AdminReporte360Tab.tsx
src/data/encuesta360Data.ts
src/data/instituciones.ts
src/utils/reporte360Calculator.ts
```

### Fichiers à CRÉER

```
src/utils/apiFetch.ts                  ← Utilitaire fetch centralisé
server/routes/fichas.ts                ← CRUD fichas
server/routes/encuestas.ts             ← CRUD encuestas
server/routes/geography.ts             ← CRUD géographie
server/routes/config360.ts             ← CRUD domaines/compétences/items/poids
server/routes/trash.ts                 ← Corbeille
server/routes/rpc.ts                   ← Fonctions RPC (directivos, instituciones)
server/routes/export.ts                ← Export SQL
```

### Fichiers à SUPPRIMER

```
src/integrations/supabase/client.ts
src/integrations/supabase/types.ts
supabase/config.toml
supabase/functions/create-user/index.ts
supabase/functions/manage-users/index.ts
supabase/functions/export-database/index.ts
.env (remplacer par les nouvelles variables)
```

---

## Estimation de l'effort

| Phase | Effort estimé |
|---|---|
| DB : export + nettoyage + import | 2-3 heures |
| Backend : routes métier (~8 fichiers) | 4-6 heures |
| Frontend : migration 20 fichiers | 6-8 heures |
| Tests & debug | 3-4 heures |
| **Total** | **~15-20 heures** |
