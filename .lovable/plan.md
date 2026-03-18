

# Plan: Compléter la purge des données opérationnelles

## Problème

L'outil de purge actuel omet **5 tables opérationnelles** qui contiennent encore des données après une purge. De plus, `deleted_records` semble ne pas avoir été vidée correctement (6 lignes restantes).

## Tables à ajouter à la liste de purge

| Table | Contenu | Justification |
|---|---|---|
| `encuestas_ambiente_escolar` | Réponses d'enquêtes d'ambiance scolaire | Données opérationnelles |
| `encuesta_360_visibility` | Contrôles de visibilité des enquêtes 360 | Configuration opérationnelle par fase/scope |
| `operator_permissions` | Permissions des opérateurs | Données opérationnelles (les comptes admin restent via `admin_cedulas`) |
| `satisfaccion_config` | Activation des formulaires de satisfaction | Configuration opérationnelle (sans cela, aucun formulaire n'est accessible) |
| `satisfaccion_report_content` | Contenu éditorial des rapports de satisfaction | Données opérationnelles |
| `satisfaccion_form_definitions` | Définitions personnalisées de formulaires | Données opérationnelles |

## Modification

**Fichier** : `src/components/admin/AdminPurgeDataTab.tsx`

1. Ajouter les 6 tables ci-dessus à `TABLES_TO_PURGE`, en respectant l'ordre FK (enfants d'abord) :
   - `satisfaccion_responses` est déjà dans la liste (pas de FK bloquante)
   - Ajouter `encuestas_ambiente_escolar`, `satisfaccion_report_content`, `satisfaccion_form_definitions`, `satisfaccion_config`, `encuesta_360_visibility`, `operator_permissions` en fin de liste (pas de FK enfants)

2. Mettre à jour les labels en espagnol pour chaque nouvelle table.

3. Aucun changement de base de données requis, aucune migration.

## Tables qui restent préservées (confirmé)

Comptes admin, géographie, structure rúbricas/360, KPI/MEL, `app_settings`, `app_images`, `role_permissions`, `custom_roles`, `user_custom_roles`.

