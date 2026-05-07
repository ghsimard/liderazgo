
-- Backup current rubrica data before import from prod
CREATE TABLE IF NOT EXISTS _backup_rubrica_evaluaciones_20260507 AS SELECT * FROM rubrica_evaluaciones;
CREATE TABLE IF NOT EXISTS _backup_rubrica_asignaciones_20260507 AS SELECT * FROM rubrica_asignaciones;
CREATE TABLE IF NOT EXISTS _backup_rubrica_evaluadores_20260507 AS SELECT * FROM rubrica_evaluadores;
CREATE TABLE IF NOT EXISTS _backup_rubrica_submission_dates_20260507 AS SELECT * FROM rubrica_submission_dates;
CREATE TABLE IF NOT EXISTS _backup_rubrica_modules_20260507 AS SELECT * FROM rubrica_modules;
CREATE TABLE IF NOT EXISTS _backup_rubrica_items_20260507 AS SELECT * FROM rubrica_items;
CREATE TABLE IF NOT EXISTS _backup_rubrica_seguimientos_20260507 AS SELECT * FROM rubrica_seguimientos;
CREATE TABLE IF NOT EXISTS _backup_rubrica_regional_analyses_20260507 AS SELECT * FROM rubrica_regional_analyses;

-- Truncate dev tables (admin_cedulas excluded — will be UPSERTed)
TRUNCATE TABLE
  rubrica_regional_analyses,
  rubrica_seguimientos,
  rubrica_submission_dates,
  rubrica_evaluaciones,
  rubrica_asignaciones,
  rubrica_evaluadores,
  rubrica_items,
  rubrica_modules
CASCADE;
