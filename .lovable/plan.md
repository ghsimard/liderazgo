## Cause

`src/components/admin/AdminAmbienteStatsTab.tsx` ligne 186 charge les cohortes avec un filtre explicite `.gte("year", 2026)`. Les cohortes **Medellín 2025**, **Itagüí 2025** et **Rionegro 2025** ont `year = 2025` et sont donc écartées, ainsi que toutes leurs respuestas (ligne 192, qui ne garde que les submissions rattachées aux cohortes chargées).

À noter : le Monitor (`AdminAmbienteMonitorTab.tsx`), lui, ne filtre pas par année — c'est pourquoi les 2025 y apparaissent bien. C'est un oubli localisé à l'onglet Estadísticas.

## Correction

### 🖥️ Site statique (Frontend) — une seule ligne

`src/components/admin/AdminAmbienteStatsTab.tsx` ligne 186 : retirer le `.gte("year", 2026)`.

Avant :
```ts
supabase.from("ae_cohortes").select("id, year, nombre").gte("year", 2026),
```

Après :
```ts
supabase.from("ae_cohortes").select("id, year, nombre"),
```

Le tri existant (`.sort((a, b) => b.year - a.year)` ligne 196) place déjà 2026 avant 2025 dans le dropdown, donc l'ordre reste cohérent.

Mettre à jour le commentaire ligne 189 (« Only keep submissions belonging to current cohortes (2026+) » → « ... belonging to any known cohorte »).

### ⚙️ Web Service — aucune action

### 🗄️ Base de données — aucune action

Les données 2025 sont déjà présentes (`ae_cohortes`, `encuestas_ambiente_escolar.cohorte_id`, `ae_rectores_2025`, `ae_docentes_submissions_2025`, etc.). Le Monitor le prouve.

## Vérification

Après la modif : ouvrir `/admin?tab=ambiente-escolar` → sous-onglet **Estadísticas** → le sélecteur de cohorte doit lister Medellín 2025, Itagüí 2025 et Rionegro 2025 en plus des cohortes 2026.

## Point d'attention

Vérifier rapidement que les autres sous-onglets Ambiente (Delta, Campañas, 2025) n'ont pas non plus un filtre `year >= 2026` involontaire. `AdminAmbiente2025Tab` est logiquement dédié à 2025 (pas de filtre à ajouter), mais `AdminAmbienteDeltaTab` mérite un coup d'œil dans la même passe si vous le souhaitez.

Voulez-vous que je limite la correction à Estadísticas uniquement, ou que j'audite aussi Delta et Campañas dans la foulée ?
