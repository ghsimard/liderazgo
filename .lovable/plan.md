
# Plan — Option 2 : Unification des IE via vue SQL

Objectif : supprimer la double source de vérité entre `ae_cohorte_instituciones` (liste figée saisie manuellement) et `fichas_rlt` (liste réelle des IE ayant un directivo). À terme, une seule source : **`fichas_rlt`**, exposée via une vue SQL par cohorte, avec `ae_cohorte_instituciones` déprécié.

## Principe

Aujourd'hui la jointure fichas ↔ cohorte se fait par un mapping en dur `region → entidad_territorial` dans le frontend (`Oriente 2026 → Antioquia`, etc.). Ce n'est pas robuste. On corrige d'abord ce lien, puis on crée la vue.

```text
fichas_rlt (region, nombre_ie)
        │
        │  join sur region
        ▼
ae_cohortes (region, entidad_territorial, year, ...)
        │
        │  cohorte_id
        ▼
v_ae_instituciones_por_cohorte (cohorte_id, institucion_educativa)
```

## Étapes

### 1. 🗄️ Base de données (Manual SQL – Lovable Cloud + Render)

**a)** Ajouter une colonne `region` (TEXT) à `ae_cohortes` et la remplir depuis `entidad_territorial` via le mapping actuel (Antioquia→Oriente 2026, Quibdó→Quibdó 2026, Rionegro/Itagüí/Medellín 2025→identique). Rendre `region` NOT NULL après backfill.

**b)** Créer la vue :

```sql
CREATE OR REPLACE VIEW public.v_ae_instituciones_por_cohorte AS
SELECT c.id AS cohorte_id,
       f.nombre_ie AS institucion_educativa
FROM public.ae_cohortes c
JOIN public.fichas_rlt f ON f.region = c.region
GROUP BY c.id, f.nombre_ie;

GRANT SELECT ON public.v_ae_instituciones_por_cohorte TO authenticated, anon, service_role;
```

**c)** Ne PAS toucher `ae_cohorte_instituciones` pour l'instant (compat descendante pendant la migration frontend).

### 2. ⚙️ Web Service (Backend Express — Render)

Le shim `dbClient` / `server/routes/db.ts` liste les tables autorisées via whitelist. Ajouter `v_ae_instituciones_por_cohorte` à la liste des ressources lisibles (GET seulement, pas d'écriture).

### 3. 🖥️ Site statique (Frontend)

Remplacer les 4 lectures actuelles de `ae_cohorte_instituciones` par la vue :

- `src/components/AmbienteEscolarForm.tsx` (combobox de sélection IE — c'est le fix principal pour Oriente 2026 : 16 → 21 IE).
- `src/components/admin/AdminAmbienteMonitorTab.tsx` (tableau de suivi de collecte).
- `src/components/admin/AdminAmbienteDeltaTab.tsx` (comparaison Entrada/Salida).
- `src/components/admin/AdminAmbienteStatsTab.tsx` (statistiques).

Aucune modification de la logique métier : la vue a exactement le même contrat de colonnes (`cohorte_id`, `institucion_educativa`) que la table remplacée. Le mapping "IE - Municipio" côté monitor devient inutile puisque `fichas_rlt.nombre_ie` est la version canonique — on peut retirer le `findDirectivo` de secours (chunk `prefix` ligne 174-179).

### 4. Admin AE Cohortes — nettoyage UI

Dans `AdminAmbienteCampanasTab` et écran de gestion des cohortes : retirer l'ajout/suppression manuel d'IE à une cohorte (devenu automatique). Afficher la liste en **lecture seule** depuis la vue, avec le compteur "X IE avec ficha".

### 5. 🗄️ Dépréciation (après validation en prod)

Une fois toutes les lectures migrées et validées sur 1-2 semaines :

```sql
ALTER TABLE public.ae_cohorte_instituciones RENAME TO _deprecated_ae_cohorte_instituciones_YYYYMMDD;
```

Puis suppression définitive au tour suivant. Migration réversible tant que la table est renommée.

## Détails techniques

- **Mapping region↔ET actuel** (à figer en SQL pour le backfill) : `Antioquia→Oriente 2026`, `Quibdó→Quibdó 2026`, `Rionegro→Rionegro 2025`, `Itagüí→Itagüí 2025`, `Medellín→Medellín 2025`. Toute nouvelle cohorte devra fournir `region` explicitement.
- **Nom d'IE canonique** = `fichas_rlt.nombre_ie` (Title case, sans suffixe municipio). Cohérence garantie côté saisie par les règles de mémoire projet.
- **Perf** : la vue est simple (join + distinct), acceptable pour <100 IE par cohorte. Pas besoin de MATERIALIZED VIEW.
- **Compat proxy PostgREST** : le shim `dbClient` sait lire une vue comme une table. Les filtres `.eq("cohorte_id", ...)`, `.select("institucion_educativa, cohorte_id")` fonctionnent identiquement.
- **Multi-cohortes par IE** : une IE peut apparaître dans plusieurs cohortes (Entrada + Salida différentes années). La vue le supporte nativement via le `GROUP BY c.id, f.nombre_ie`.
- **Rendu Render** : nécessitera l'exécution manuelle du SQL sur la base Render (constraint mémoire projet : pas de RLS Render, SQL manuel).

## Impact utilisateur

- Oriente 2026 affichera immédiatement **21 IE** au lieu de 16 dans le combobox Ambiente Escolar et dans les tableaux de suivi admin.
- Toute nouvelle IE ajoutée via une Ficha RLT apparaît automatiquement dans sa cohorte, sans intervention admin.
- Plus de risque d'incohérence entre les deux listes.

## Livrables

1. Migration SQL Lovable Cloud (ajout colonne `region`, backfill, vue, GRANT).
2. SQL manuel équivalent pour Render (fourni dans un fichier `.sql` pour copier-coller).
3. Ajout de la vue à la whitelist Express.
4. Refactor des 4 composants frontend (retrait aussi du mapping en dur `etMap`).
5. Nettoyage UI admin cohortes (lecture seule).
6. Note de dépréciation dans `SPECIFICATIONS.md`.
