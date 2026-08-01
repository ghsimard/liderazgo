# Cloisonnement des données — Encuesta 360 indépendante

## Objectif

Le nouveau site Encuesta 360 partage la même base de données que la plateforme actuelle (pour la synchronisation bidirectionnelle de la **configuration** : dominios, competencias, items, ponderaciones), mais les **fichas** et les **résultats** saisis depuis le nouveau site ne doivent **jamais** apparaître dans le site actuel.

## Approche retenue

Une colonne d'origine (`app_origen`) sur les tables de données opérationnelles :

- `'rlt'` (valeur par défaut) → données créées par la plateforme actuelle
- `'e360'` → données créées par le nouveau site

Le site actuel filtre systématiquement `app_origen = 'rlt'`. Le nouveau site filtre `app_origen = 'e360'` et démarre donc à zéro côté données collectées, tout en lisant la configuration partagée.

Cette approche évite de dupliquer 40+ tables et garde la configuration réellement synchronisée en temps réel.

```text
                 ┌───────────────────────────┐
                 │   Base Postgres partagée  │
                 ├───────────────────────────┤
  Site actuel ──▶│ config 360   (partagée)   │◀── Nouveau site
                 │ ─────────────────────────  │
                 │ fichas_rlt   app_origen    │
                 │ encuestas_360 app_origen   │
                 └───────────────────────────┘
                   'rlt' visible   'e360' visible
                   côté actuel     côté nouveau
```

## Actions à réaliser

### 🗄️ Base de données (SQL manuel sur Render)

Ajouter la colonne d'origine sur les tables de données collectées, avec valeur par défaut `'rlt'` pour tout l'existant, plus un index pour les filtres :

```sql
ALTER TABLE public.fichas_rlt
  ADD COLUMN IF NOT EXISTS app_origen text NOT NULL DEFAULT 'rlt';

ALTER TABLE public.encuestas_360
  ADD COLUMN IF NOT EXISTS app_origen text NOT NULL DEFAULT 'rlt';

CREATE INDEX IF NOT EXISTS idx_fichas_rlt_app_origen
  ON public.fichas_rlt (app_origen);
CREATE INDEX IF NOT EXISTS idx_encuestas_360_app_origen
  ON public.encuestas_360 (app_origen);
```

À valider avant exécution : si d'autres tables reçoivent des écritures du nouveau site (invitations/tokens d'évaluateurs externes, partages d'accès 360), la même colonne y sera ajoutée dans la même migration.

Les tables de **configuration** (`items_360`, `competency_weights`, dominios/competencias, `encuesta_360_visibilidad`) **ne reçoivent pas** cette colonne : elles restent communes aux deux applications.

### ⚙️ Web Service (Backend Express)

**`server/routes/db.ts`** — ajouter `app_origen` aux listes de colonnes autorisées (whitelists INSERT/UPDATE) pour `fichas_rlt` et `encuestas_360`, afin que le nouveau site puisse écrire sa valeur d'origine et que le site actuel continue d'écrire `'rlt'`.

**`server/routes/rpc.ts`** — les fonctions SQL utilisées par le site actuel (`get_ficha_by_cedula`, `get_own_autoevaluacion`, etc.) doivent restreindre leurs résultats à `app_origen = 'rlt'`, sinon une ficha du nouveau site pourrait ressortir par ce chemin. Les fonctions concernées seront listées et corrigées dans la migration SQL.

### 🖥️ Site statique (Frontend — plateforme actuelle)

Centraliser le filtre plutôt que de le répéter partout :

**`src/utils/dbClient.ts`** — ajouter un helper (par ex. `APP_ORIGEN = 'rlt'`) et l'appliquer :
- à chaque `.insert()` sur `fichas_rlt` et `encuestas_360` → écrire `app_origen: 'rlt'`
- à chaque `.select()` sur ces tables → `.eq("app_origen", "rlt")`

Fichiers à mettre à jour (lecture et/ou écriture) :
- `src/pages/FichaRLT.tsx`, `src/pages/AdminEditFicha.tsx`
- `src/components/admin/AdminFichasTab.tsx`, `AdminEncuestas360Tab.tsx`, `AdminEncuestaMonitor.tsx`, `AdminDashboardTab.tsx`, `AdminTrashManager.tsx`, `AdminPurgeDataTab.tsx`
- `src/components/Encuesta360Form.tsx`, `src/pages/Encuesta360Hub.tsx`
- `src/utils/reporte360Calculator.ts`, `src/utils/reporte360MelCalculator.ts` (rapports et deltas MEL)

Résultat : tous les tableaux de bord, monitoreos, rapports PDF et exports du site actuel excluent automatiquement les données du nouveau site.

### 🆕 Nouveau site Encuesta 360

Même mécanique inversée : constante `APP_ORIGEN = 'e360'`, écrite à chaque insertion et appliquée à chaque lecture de fichas/résultats. La configuration 360 est lue sans filtre (partagée).

## Points de vigilance

- **Purge et Papelera** : les outils de suppression du site actuel doivent aussi filtrer sur `'rlt'`, pour ne jamais effacer des données du nouveau site.
- **Unicité par cédula** : si une même personne remplit une ficha des deux côtés, les contraintes d'unicité existantes sur `numero_cedula` pourraient bloquer. À vérifier et, le cas échéant, transformer en unicité composite `(numero_cedula, app_origen)`.
- **Rétroactivité** : aucune donnée existante n'est modifiée — le `DEFAULT 'rlt'` marque automatiquement tout l'historique comme appartenant au site actuel.
