## Objectif
Importer les données rubricas de prod (CSV uploadés) dans la base dev Supabase, en remplaçant les données existantes. `fichas_rlt` est déjà synchronisé — pas de souci de FK directivos.

## Fichiers à importer
| Fichier | Lignes |
|---|---|
| admin_cedulas.csv | 3 |
| rubrica_modules.csv | 4 |
| rubrica_items.csv | 12 |
| rubrica_evaluadores.csv | 7 |
| rubrica_asignaciones.csv | 280 |
| rubrica_submission_dates.csv | 151 |
| rubrica_evaluaciones.csv | 190 |
| rubrica_seguimientos.csv | 0 (vide) |
| rubrica_regional_analyses.csv | 0 (vide) |

## Étapes (mode default)

### 1. Préparation
- `code--copy` chaque CSV de `user-uploads://` vers `/tmp/`
- Vérifier `test -n "$PGHOST"` pour confirmer accès `psql` direct

### 2. Backup dev (migration SQL)
```sql
CREATE TABLE _backup_rubrica_evaluaciones_20260507 AS SELECT * FROM rubrica_evaluaciones;
CREATE TABLE _backup_rubrica_asignaciones_20260507 AS SELECT * FROM rubrica_asignaciones;
CREATE TABLE _backup_rubrica_evaluadores_20260507 AS SELECT * FROM rubrica_evaluadores;
CREATE TABLE _backup_rubrica_submission_dates_20260507 AS SELECT * FROM rubrica_submission_dates;
-- (modules/items/seguimientos/regional_analyses : peu de données, skip ou backup léger)
```

### 3. Vider les tables dev (migration)
```sql
TRUNCATE rubrica_regional_analyses, rubrica_seguimientos, rubrica_submission_dates,
         rubrica_evaluaciones, rubrica_asignaciones, rubrica_evaluadores,
         rubrica_items, rubrica_modules CASCADE;
```
`admin_cedulas` : **pas de TRUNCATE** (préserve les comptes admin actuels) — UPSERT par cédula.

### 4. Import via `psql \COPY`
Ordre strict :
1. `admin_cedulas` → table temp puis `INSERT ... ON CONFLICT (cedula) DO NOTHING`
2. `rubrica_modules`
3. `rubrica_items`
4. `rubrica_evaluadores`
5. `rubrica_asignaciones`
6. `rubrica_submission_dates`
7. `rubrica_evaluaciones`
8. `rubrica_seguimientos` (vide, skip)
9. `rubrica_regional_analyses` (vide, skip)

### 5. Vérifications
- `SELECT count(*)` chaque table = compte CSV
- Vérifier que les `directivo_cedula` référencés existent dans `fichas_rlt` (warning si écart)
- Tester `/admin?tab=rubricas` dans la preview

## Points d'attention
- Aucune FK formelle sur `rubrica_*` (vérifié) — l'import passe même avec orphelins, mais l'UI risque de casser ; un rapport d'écarts sera émis après import.
- Les comptes admin dev (Maribel, admin, Admin Ghis) sont préservés via UPSERT.
- En cas de souci, restauration immédiate depuis les tables `_backup_*`.

Approuve pour que je lance.
