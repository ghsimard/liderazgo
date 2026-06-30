# Plan — Réplique indépendante "Encuesta 360" (app autonome)

## 1. Objectif
Créer une nouvelle application Lovable **totalement séparée** de RLT, dédiée uniquement à la Encuesta 360, déployée sur Render (Static Site + Web Service Express), avec sa propre base Supabase. Données initiales seedées depuis RLT, puis sync **bidirectionnelle avec confirmation** sur les tables de référence.

## 2. Périmètre fonctionnel

### Conservé depuis RLT
- Hub Encuesta 360 (Entrada / Salida)
- 6 formularios : Acudiente, Administrativo, Autoevaluación, Directivo, Docente, Estudiante
- Structure pédagogique : Dominios → Competencias → Items → Item texts → Ponderaciones
- Génération PDF (Reporte 360, blank, etc.)
- Partage par token UUID
- Monitoreo 360 (cohorte par institution)
- Gestion comptes admin + RBAC
- Fichas de Información (vidées, mais structure conservée)

### Supprimé
- Concept de **Région** (tables `regiones`, `region_*`)
- Modules RLT non liés : Rúbricas, Satisfacciones, Ambiente Escolar, MEL, Informe Módulo, Asistencia, Tablero de Control, Contact, Reviews, Operator Permissions régionales
- Tous les `_backup_*`

### Hiérarchie géographique simplifiée
`Entidad Territorial → Municipio → Institución` (3 niveaux, plus de Région)

## 3. Architecture cible

```text
┌─────────────────────────┐     ┌─────────────────────────┐
│   App RLT (actuelle)    │     │   App 360 (nouvelle)    │
│   rltficha.lovable.app  │     │   <domaine à définir>   │
│   Render Static + WS    │     │   Render Static + WS    │
│   Supabase #1           │     │   Supabase #2 (neuf)    │
└──────────┬──────────────┘     └─────────┬───────────────┘
           │                              │
           │  POST /api/sync/from-360 ←───┤  (modale confirm)
           ├───→ POST /api/sync/from-rlt  │  (modale confirm)
           │                              │
           └──── Tables synchronisées ────┘
                 (par cedula/code/id stable)
```

## 4. Base de données nouvelle app

### Tables conservées (structure identique RLT, seedées)
- `domains_360`, `competencies_360`, `items_360`, `item_texts_360`, `competency_weights`
- `entidades_territoriales`, `municipios`, `instituciones`
- `admin_cedulas`, `custom_roles`, `role_permissions`, `user_custom_roles`
- `app_settings`, `app_images`

### Tables conservées mais **vidées**
- `fichas_rlt` (structure complète, 0 lignes)
- `encuestas_360`, `encuesta_invitaciones`, `encuesta_360_visibility`
- `user_activity_log`

### Tables supprimées
- `regiones`, `region_entidades`, `region_municipios`, `region_instituciones`
- Toutes les tables non-360 listées au point 2

## 5. Seed initial RLT → Nouvelle App

Script one-shot (à lancer manuellement) qui copie depuis RLT vers la nouvelle DB :
1. `entidades_territoriales`, `municipios`, `instituciones`
2. `domains_360`, `competencies_360`, `items_360`, `item_texts_360`, `competency_weights`
3. `admin_cedulas` + `custom_roles` + `role_permissions`
4. `app_settings` (clés 360 uniquement) + `app_images` (logos référencés)

Aucune donnée transactionnelle (réponses, invitaciones, fichas) n'est copiée.

## 6. Synchronisation bidirectionnelle avec confirmation

### Tables synchronisées
`entidades_territoriales`, `municipios`, `instituciones`, `domains_360`, `competencies_360`, `items_360`, `item_texts_360`, `competency_weights`

### Mécanisme
- Toute opération **Create / Update / Delete** sur ces tables côté UI ouvre une **modale** :
  > "Cette modification doit-elle aussi être appliquée dans l'app [RLT|360] ?"
  > [Seulement ici] [Répliquer dans l'autre app]
- Si confirmé : appel HTTP authentifié vers l'autre app
  - Nouvelle app → RLT : `POST https://<rlt-ws>/api/sync/from-360`
  - RLT → Nouvelle app : `POST https://<new-ws>/api/sync/from-rlt`
- Payload : `{ table, operation, identifier, payload, source_app }`
- Auth : header `X-Sync-Token` (secret partagé `SYNC_SHARED_TOKEN`)
- Idempotence : champ `sync_origin_id` (uuid) pour éviter les boucles

### Identifiants stables (pas d'UUID croisé)
- `instituciones.codigo_dane` (12 chiffres)
- `municipios.codigo_dane` (5 chiffres)
- `entidades_territoriales.nombre`
- `domains_360.code`, `competencies_360.code`, `items_360.code`

## 7. Authentification
- **Admins** : cédula + mot de passe (Express JWT) — identique RLT
- **Directivos** : cédula uniquement, validation contre `fichas_rlt`
- **Évaluateurs externes** (Acudiente/Docente/Estudiante/Administrativo) : token UUID sans login

## 8. Déploiement Render

### 🖥️ Site statique (nouveau)
- Repo Git séparé
- Build : `bun install && bun run build`
- Variables : `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### ⚙️ Web Service Express (nouveau)
- Routes : `/api/db/*`, `/api/auth/*`, `/api/sync/from-rlt`, `/api/sync/to-rlt`, `/api/grok/*` (si analyse 360 conservée)
- Variables : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `SYNC_SHARED_TOKEN`, `RLT_WS_URL`, `XAI_API_KEY`

### 🖥️⚙️ Modifications app RLT (existante)
- Ajouter route `POST /api/sync/from-360` sur Express RLT
- Ajouter modale de confirmation côté UI dans les écrans qui éditent les 7 tables partagées
- Ajouter `SYNC_SHARED_TOKEN` + `NEW_360_WS_URL` dans variables Render RLT

### 🗄️ Base de données
- **Nouvelle Supabase** : appliquer toutes les migrations 360 (extraites des migrations RLT)
- **RLT existante** : ajouter colonne `sync_origin_id uuid` sur les 7 tables synchronisées + index unique

## 9. Phases de livraison

1. **Phase 1 — Bootstrap** : nouveau projet Lovable, structure de base, auth admin/directivo, schéma DB
2. **Phase 2 — Encuesta 360** : copier hub + 6 formularios + Config 360 + Reporte
3. **Phase 3 — Seed** : script de copie RLT → nouvelle DB
4. **Phase 4 — Sync** : endpoints `/api/sync/*` des 2 côtés + modale UI
5. **Phase 5 — Render** : déploiement Static + WS + domaine
6. **Phase 6 — Recette** : tests bout-en-bout sur les 6 formularios + sync bidirectionnelle

## 10. Points à confirmer plus tard (non bloquants)
- Nom de domaine final
- Faut-il sync les `admin_cedulas` et rôles ? (pour l'instant **non**, chaque app a ses propres admins)
- Faut-il sync les `fichas_rlt` ? (pour l'instant **non**, la nouvelle app aura ses propres directivos)
