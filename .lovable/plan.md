# Ampliación de cargos directivos en la Ficha de Información Básica

## Objetivo

Añadir dos cargos nuevos al selector "Cargo actual" de la Ficha, además de los actuales:

- Rector/a (existente)
- Coordinador/a (existente)
- **Director/a rural** (nuevo)
- **Director/a de núcleo** (nuevo)

Los cuatro cargos se consideran **directivos plenos**: deben participar en todos los módulos (Encuestas 360, Asistencia, Informe, MEL, Reportes, Dashboard, Rúbricas, etc.) exactamente como Rector/a y Coordinador/a hoy.

## Alcance funcional

- Disponibles en **todas las regiones** del selector de la Ficha pública y de la edición Admin.
- Excepción mantenida: la región "Quibdó 2026" sigue forzando "Rector/a" (no cambia).
- Etiquetas con flexión de género en la UI vía `genderizeRole` ("Director rural" / "Directora rural", "Director de núcleo" / "Directora de núcleo"). El valor almacenado en BD permanece neutro ("Director/a rural", "Director/a de núcleo").

## Cambios necesarios

### 🖥️ Site statique (Frontend)

1. **Selector de cargo en la Ficha pública** — `src/pages/FichaRLT.tsx`
   - Añadir las dos opciones nuevas al `FormSelect` de `cargo_actual`.

2. **Edición Admin de la Ficha** — `src/pages/AdminEditFicha.tsx`
   - Replicar las dos opciones nuevas en el mismo selector.

3. **Flexión de género** — `src/utils/genderizeRole.ts`
   - Añadir reglas: `Director\/a rural` → "Director rural" / "Directora rural", `Director\/a de núcleo` → "Director de núcleo" / "Directora de núcleo". (Las reglas existentes para "Director/a" ya cubren parcialmente, pero conviene asegurar la coincidencia exacta de las nuevas etiquetas compuestas.)

4. **Listas de filtros "directivos"** — actualizar todos los `.in("cargo_actual", [...])` para incluir los 4 cargos. Archivos afectados:
   - `src/data/encuesta360Data.ts`
   - `src/utils/melRubricaCalculator.ts`
   - `src/components/admin/AdminEvalIndividualTab.tsx`
   - `src/components/admin/AdminEncuestaMonitor.tsx`
   - `src/components/admin/AdminDashboardTab.tsx`
   - `src/components/admin/AdminMelRubricasTab.tsx`
   - `src/components/admin/AdminReporte360Tab.tsx`
   - `src/components/admin/AdminAsistenciaTab.tsx`
   - `src/components/admin/AdminInformeReportTab.tsx`
   - `src/components/admin/AdminEvaluadoresTab.tsx`
   - `src/components/admin/AdminAsistenciaStats.tsx`
   - `src/components/admin/AdminMelTab.tsx`
   - `src/components/admin/AdminInformeModuloForm.tsx`
   - Para evitar mantener la lista en 13 lugares, centralizar la constante en `src/utils/genderizeRole.ts` (o un nuevo `src/utils/directivoRoles.ts`) exportando `DIRECTIVO_CARGOS = ["Rector/a", "Coordinador/a", "Director/a rural", "Director/a de núcleo"]` e importarla en todos los puntos anteriores.

### ⚙️ Web Service (Backend Express)

1. **Filtros server-side en proxy RPC** — `server/routes/rpc.ts` (3 ocurrencias en líneas ~41, ~159, ~203):
   - Reemplazar `IN ('Rector/a', 'Coordinador/a')` por `IN ('Rector/a', 'Coordinador/a', 'Director/a rural', 'Director/a de núcleo')`.
   - Afecta funciones: `get_directivos_por_institucion`, validación de cédula de directivo, etc.

2. **Esquema documental** — `server/schema.sql` (2 ocurrencias en líneas ~357, ~652):
   - Actualizar los `IN (...)` en las funciones SQL versionadas para que el archivo refleje la realidad de producción.

### 🗄️ Base de datos (Manual SQL en Render)

No hay cambio de esquema (la columna `cargo_actual` es `text` libre).

Sin embargo, las funciones SQL `get_directivos_por_institucion(p_nombre_ie)` y `check_cedula_role(p_cedula)` están desplegadas en la BD productiva con la lista cerrada de dos cargos. Para que reconozcan los nuevos cargos hay que ejecutar **manualmente** en el Editor SQL de la base:

```sql
CREATE OR REPLACE FUNCTION public.get_directivos_por_institucion(p_nombre_ie text)
RETURNS TABLE(cargo_actual text, nombres_apellidos text, numero_cedula text, genero text)
LANGUAGE sql STABLE AS $$
  SELECT cargo_actual, nombres_apellidos, numero_cedula, genero
  FROM fichas_rlt
  WHERE nombre_ie = p_nombre_ie
    AND cargo_actual IN ('Rector/a','Coordinador/a','Director/a rural','Director/a de núcleo')
  ORDER BY nombres_apellidos;
$$;

CREATE OR REPLACE FUNCTION public.check_cedula_role(p_cedula text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'exists_ficha', EXISTS (SELECT 1 FROM fichas_rlt WHERE numero_cedula = p_cedula),
    'is_admin',     EXISTS (SELECT 1 FROM admin_cedulas WHERE cedula = p_cedula),
    'is_directivo', EXISTS (
      SELECT 1 FROM fichas_rlt
      WHERE numero_cedula = p_cedula
        AND cargo_actual IN ('Rector/a','Coordinador/a','Director/a rural','Director/a de núcleo')
    ),
    'is_evaluador', EXISTS (SELECT 1 FROM rubrica_evaluadores WHERE cedula = p_cedula),
    'is_operator',  EXISTS (SELECT 1 FROM operator_permissions WHERE cedula = p_cedula),
    'cargo_actual', (SELECT cargo_actual FROM fichas_rlt WHERE numero_cedula = p_cedula LIMIT 1),
    'nombre', COALESCE(
      (SELECT nombres_apellidos FROM fichas_rlt WHERE numero_cedula = p_cedula LIMIT 1),
      (SELECT nombre FROM rubrica_evaluadores WHERE cedula = p_cedula LIMIT 1)
    ),
    'genero', (SELECT genero FROM fichas_rlt WHERE numero_cedula = p_cedula LIMIT 1)
  );
$$;
```

## Impacto en módulos existentes

Una vez aplicado, los nuevos cargos:

- Pueden iniciar sesión como directivos vía cédula.
- Aparecen en Encuestas 360 (Autoevaluación, evaluadores, monitor, reportes).
- Aparecen en Asistencia, Informe, MEL, Rúbricas, Dashboard, Reporte 360.
- Son reconocidos por el flujo de verificación de la Ficha y por "Mi Panel".

No se requiere migración de datos: las fichas existentes con "Rector/a" o "Coordinador/a" no se ven afectadas.

## Detalles técnicos

- Mantener los valores almacenados con el sufijo `/a` para coherencia con el esquema de género actual (`genderizeRole` los flexiona en la UI).
- La centralización de `DIRECTIVO_CARGOS` reduce el riesgo de olvidar un punto cuando se vuelvan a añadir cargos en el futuro.
- No se tocan archivos auto-generados (`src/integrations/supabase/types.ts`, `.env`).
