

# Diagramme du flux d'authentification et de session

## Ce que le diagramme couvrira

Le flux complet depuis l'écran d'accueil (`/`) jusqu'aux panneaux finaux, incluant les deux chemins d'authentification distincts du système.

## Architecture du flux

```text
┌─────────────────────────────────────────────────────────────────┐
│                     ÉCRAN D'ACCUEIL (/)                         │
│                  Saisie du numéro de cédula                     │
│                           │                                     │
│                  RPC: check_cedula_role()                        │
│                           │                                     │
│              ┌────────────┼────────────┐                        │
│              ▼            ▼            ▼                         │
│         is_admin    is_directivo   is_operator                   │
│         is_evaluador               cédula inconnue              │
│              │            │            │          │              │
│              │            │            │     Confirmation        │
│              │            │            │     → /ficha            │
│              │            │            │                         │
│    Si MULTIPLES RÔLES → Dialog de choix                         │
│              │            │            │                         │
│    ┌─────────┘     ┌──────┘     ┌──────┘                        │
│    ▼               ▼            ▼                               │
│ /admin/login    /mi-panel    /operador                           │
└─────────────────────────────────────────────────────────────────┘

┌─ CHEMIN ADMIN ──────────────────────────────────────────────────┐
│  /admin/login                                                    │
│    Email + Mot de passe                                          │
│           │                                                      │
│    apiLogin(email, password)                                     │
│    ┌──────┴──────┐                                               │
│    │ EXPRESS     │ SUPABASE                                      │
│    │ POST /api/  │ signInWithPassword()                          │
│    │ auth/login  │                                               │
│    │ → JWT token │ → session token                               │
│    │ localStorage│ localStorage                                  │
│    └──────┬──────┘                                               │
│           ▼                                                      │
│    navigate → /admin                                             │
│           │                                                      │
│    useAdminAuth()                                                │
│    ├─ isAuthenticated() → token présent?                         │
│    ├─ apiGetMe() → user + rôles                                  │
│    ├─ Vérification rôles (Admin/Superadmin/Monitoreo)            │
│    │   └─ Rôle manquant → redirect /admin/login?reason=...       │
│    ├─ usePermissions(userId) → RBAC permissions                  │
│    └─ ✅ Accès Panel de Administración                           │
└──────────────────────────────────────────────────────────────────┘

┌─ CHEMIN MI PANEL ───────────────────────────────────────────────┐
│  /mi-panel                                                       │
│    Pas d'authentification email/password                         │
│    Accès via cédula stockée en sessionStorage                    │
│           │                                                      │
│    sessionStorage.getItem("user_cedula")                         │
│    └─ absente → redirect /                                       │
│           │                                                      │
│    RPC: check_cedula_role(cedula)                                │
│    → cargo, nom, rôles, ficha                                    │
│           │                                                      │
│    ✅ Affichage Mi Panel                                         │
│    (ficha, encuestas, rúbricas, etc.)                            │
└──────────────────────────────────────────────────────────────────┘
```

## Livrable

Un diagramme Mermaid (`.mmd`) enregistré dans `/mnt/documents/` illustrant ce flux avec les composants suivants :

1. **Noeud d'entrée** : Écran d'accueil — saisie cédula
2. **RPC check_cedula_role** : Vérification des rôles dans la BD
3. **Branchement conditionnel** : Rôle unique vs. rôles multiples (dialog de choix)
4. **3 destinations** : `/mi-panel`, `/admin/login`, `/operador`
5. **Sous-flux Admin** : Login email/password → JWT/Supabase Auth → `useAdminAuth()` → vérification rôles RBAC → Panel Admin
6. **Sous-flux Mi Panel** : Cédula en sessionStorage → RPC → affichage panel
7. **Cas d'erreur** : Cédula inconnue → confirmation → `/ficha`, token invalide → redirect login

