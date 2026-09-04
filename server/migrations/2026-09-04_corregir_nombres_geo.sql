-- ============================================================
-- Corrección de nombres de IE y verificación de eliminadas
-- ============================================================
-- Objetivo:
--   1. Corregir "Jesús Antonio Velásquez" -> "José Antonio Velásquez"
--      en la tabla de referencia y propagar el cambio a todas las
--      tablas donde el nombre de la IE está denormalizado.
--   2. Verificar las IE eliminadas recientemente (4 sep 2026) y
--      ofrecer SQL opcional para restaurarlas si eran oficiales.
--
-- Ejecutar en una transacción.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. CORREGIR NOMBRE EN LA TABLA DE REFERENCIA
-- ------------------------------------------------------------
UPDATE public.instituciones
SET nombre = 'Centro Educativo José Antonio Velásquez del 20'
WHERE nombre = 'Centro Educativo Jesús Antonio Velásquez del 20';

-- ------------------------------------------------------------
-- 2. PROPAGAR A TABLAS DENORMALIZADAS
-- ------------------------------------------------------------
UPDATE public.fichas_rlt
SET nombre_ie = 'Centro Educativo José Antonio Velásquez del 20'
WHERE nombre_ie = 'Centro Educativo Jesús Antonio Velásquez del 20';

UPDATE public.encuestas_360
SET institucion_educativa = 'Centro Educativo José Antonio Velásquez del 20'
WHERE institucion_educativa = 'Centro Educativo Jesús Antonio Velásquez del 20';

UPDATE public.encuesta_invitaciones
SET institucion = 'Centro Educativo José Antonio Velásquez del 20'
WHERE institucion = 'Centro Educativo Jesús Antonio Velásquez del 20';

UPDATE public.rubrica_asignaciones
SET institucion = 'Centro Educativo José Antonio Velásquez del 20'
WHERE institucion = 'Centro Educativo Jesús Antonio Velásquez del 20';

UPDATE public.encuestas_ambiente_escolar
SET institucion_educativa = 'Centro Educativo José Antonio Velásquez del 20'
WHERE institucion_educativa = 'Centro Educativo Jesús Antonio Velásquez del 20';

UPDATE public.ae_cohorte_instituciones
SET institucion_educativa = 'Centro Educativo José Antonio Velásquez del 20'
WHERE institucion_educativa = 'Centro Educativo Jesús Antonio Velásquez del 20';

UPDATE public.ae_docentes_submissions_2025
SET institucion_educativa = 'Centro Educativo José Antonio Velásquez del 20'
WHERE institucion_educativa = 'Centro Educativo Jesús Antonio Velásquez del 20';

UPDATE public.ae_estudiantes_submissions_2025
SET institucion_educativa = 'Centro Educativo José Antonio Velásquez del 20'
WHERE institucion_educativa = 'Centro Educativo Jesús Antonio Velásquez del 20';

UPDATE public.ae_acudientes_submissions_2025
SET institucion_educativa = 'Centro Educativo José Antonio Velásquez del 20'
WHERE institucion_educativa = 'Centro Educativo Jesús Antonio Velásquez del 20';

UPDATE public.ae_rectores_2025
SET nombre_de_la_institucion_educativa_en_la_que_usted_desempena_ = 'Centro Educativo José Antonio Velásquez del 20'
WHERE nombre_de_la_institucion_educativa_en_la_que_usted_desempena_ = 'Centro Educativo Jesús Antonio Velásquez del 20';

UPDATE public.operator_permissions
SET institucion = 'Centro Educativo José Antonio Velásquez del 20'
WHERE institucion = 'Centro Educativo Jesús Antonio Velásquez del 20';

-- ------------------------------------------------------------
-- 3. REGISTRAR EN HISTORIAL
-- ------------------------------------------------------------
INSERT INTO public.institucion_renames (
  old_name, new_name, changed_by_cedula, changed_by_nombre,
  counts, total_rows, status
)
SELECT
  'Centro Educativo Jesús Antonio Velásquez del 20',
  'Centro Educativo José Antonio Velásquez del 20',
  'sistema',
  'Corrección masiva SQL',
  '{}'::jsonb,
  0,
  'aplicado'
WHERE EXISTS (
  SELECT 1 FROM public.instituciones
  WHERE nombre = 'Centro Educativo José Antonio Velásquez del 20'
);

-- ------------------------------------------------------------
-- 4. VERIFICACIÓN: IE eliminadas recientemente
-- ------------------------------------------------------------
RAISE NOTICE '--- IE eliminadas en los últimos 7 días ---';
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT deleted_at, record_label
    FROM public.deleted_records
    WHERE record_type = 'institucion'
      AND deleted_at > now() - interval '7 days'
    ORDER BY deleted_at DESC
  LOOP
    RAISE NOTICE '  %  |  %', rec.deleted_at, rec.record_label;
  END LOOP;
END $$;

COMMIT;

-- ============================================================
-- RESTAURACIÓN OPCIONAL de IE eliminadas (ejecutar solo si se
-- confirma que alguna de ellas debe volver al referente)
-- ============================================================
/*
-- Reemplazar <id_municipio> por el municipio correcto y descomentar
-- las filas que correspondan:

BEGIN;
INSERT INTO public.instituciones (id, nombre, municipio_id, created_at)
VALUES
  (gen_random_uuid(), 'Centro Educativo Pacifico (Cepa)', '<id_municipio>', now()),
  (gen_random_uuid(), 'Cent Educ Catalina', '<id_municipio>', now()),
  (gen_random_uuid(), 'Bto Mix Manel Saturio Valencia', '<id_municipio>', now()),
  (gen_random_uuid(), 'C.e. Indigena Embera Alfonso Dumasa De Caimanero Jampapa', '<id_municipio>', now()),
  (gen_random_uuid(), 'Adventista De Quibdo Bolivar Escandon', '<id_municipio>', now());
COMMIT;
*/
