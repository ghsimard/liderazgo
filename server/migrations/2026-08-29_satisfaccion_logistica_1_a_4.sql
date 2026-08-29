-- ============================================================
-- Corrección: Satisfacción / Intensivo / sección Logística
-- Módulos 3 y 4: los valores "1" (Totalmente en desacuerdo)
-- pasan a "4" (Totalmente de acuerdo).
-- Los valores 2, 3 y 4 NO se modifican.
-- Ejecutar manualmente en producción.
-- ============================================================

BEGIN;

-- 1) Respaldo (permite deshacer)
CREATE TABLE IF NOT EXISTS _undo_satisfaccion_logistica_20260829 (
  id uuid PRIMARY KEY,
  respuestas_original jsonb NOT NULL,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO _undo_satisfaccion_logistica_20260829 (id, respuestas_original)
SELECT r.id, r.respuestas
FROM satisfaccion_responses r
WHERE r.form_type = 'intensivo'
  AND r.module_number IN (3, 4)
  AND jsonb_typeof(r.respuestas->'logistica') = 'object'
  AND EXISTS (
    SELECT 1 FROM jsonb_each_text(r.respuestas->'logistica') AS e(k, v)
    WHERE e.v = '1'
  )
ON CONFLICT (id) DO NOTHING;

-- 2) Reemplazo de "1" por "4" dentro del objeto logistica
UPDATE satisfaccion_responses r
SET respuestas = jsonb_set(
      r.respuestas,
      '{logistica}',
      (
        SELECT jsonb_object_agg(e.k, CASE WHEN e.v = '1' THEN '4' ELSE e.v END)
        FROM jsonb_each_text(r.respuestas->'logistica') AS e(k, v)
      )
    )
WHERE r.form_type = 'intensivo'
  AND r.module_number IN (3, 4)
  AND jsonb_typeof(r.respuestas->'logistica') = 'object'
  AND EXISTS (
    SELECT 1 FROM jsonb_each_text(r.respuestas->'logistica') AS e(k, v)
    WHERE e.v = '1'
  );

COMMIT;

-- 3) Verificación (después del COMMIT)
-- SELECT module_number, e.v AS valor, count(*)
-- FROM satisfaccion_responses r, jsonb_each_text(r.respuestas->'logistica') AS e(k, v)
-- WHERE r.form_type = 'intensivo' AND r.module_number IN (3,4)
-- GROUP BY 1, 2 ORDER BY 1, 2;

-- ============================================================
-- UNDO (si hace falta revertir):
-- UPDATE satisfaccion_responses r
-- SET respuestas = b.respuestas_original
-- FROM _undo_satisfaccion_logistica_20260829 b
-- WHERE r.id = b.id;
-- ============================================================
