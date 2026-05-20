# Edición por Módulo de los formularios Intensivo e Interludio

## Objetivo

1. Agregar un selector de **Módulo (1-4)** en la pestaña Admin → Satisfacciones → Formularios para previsualizar y editar.
2. Permitir que el admin **edite, agregue o quite preguntas/secciones** de los formularios *Intensivo* e *Interludio* **de manera independiente para cada módulo (1, 2, 3, 4)**. El formulario *Asistencia* se mantiene único (no depende del módulo).
3. Documentar el impacto sobre el **Informe PDF** de Satisfacciones.

---

## 1. Selector de Módulo (1-4)

En `AdminSatisfaccionFormsTab.tsx`, junto al selector de formulario, se agrega:

- Para **Intensivo** e **Interludio**: pestañas `Módulo 1 / 2 / 3 / 4`.
- Para **Asistencia**: el selector queda oculto (formulario único, idéntico a todos los módulos).

El selector controla tanto la Vista previa como el modo Editar, y se pasa como `moduleNumber` real al componente `SatisfaccionForm` (en lugar del hardcoded `1`).

---

## 2. Edición por módulo

### Modelo de datos

Hoy la tabla `satisfaccion_form_definitions` guarda **una sola definición por `form_type`** (UNIQUE en `form_type`).

Cambios:

- Agregar columna `module_number INTEGER NULL` (NULL = aplica a todos los módulos, usado por Asistencia y como *fallback* cuando un módulo aún no tiene override).
- Reemplazar la restricción UNIQUE `(form_type)` por UNIQUE `(form_type, module_number)`.
- Lógica de carga (`loadFormDefinition`):
  1. Buscar definición específica `form_type = X AND module_number = N`.
  2. Si no existe, buscar `form_type = X AND module_number IS NULL` (definición global heredada de la versión actual).
  3. Si no existe, usar el `DEFAULT_FORMS` estático de `src/data/satisfaccionData.ts`.

### Comportamiento en el editor

- Al cambiar de módulo se recarga la definición correspondiente.
- Botón **Guardar** persiste la definición con el `module_number` activo.
- Botón **Restablecer** borra solo la fila de ese módulo (vuelve al fallback global o al default).
- Indicador visual:
  - "Personalizado para Módulo N" si hay fila propia.
  - "Heredado (global)" si hereda de la definición sin `module_number`.
  - "Por defecto" si no hay nada en DB.
- Nuevo botón **"Copiar desde otro módulo"** (Módulo 1 → 2, etc.) para acelerar la configuración.

### Aplicación en el formulario público

`loadFormDefinition()` en `src/data/satisfaccionData.ts` (y el componente `SatisfaccionPage`) recibe ahora `(formType, moduleNumber)` y aplica la misma cascada Específico → Global → Default. Las páginas `/satisfaccion-intensivo` y `/satisfaccion-interludio` ya conocen `moduleNumber` por la query string.

---

## 3. Impacto en el Informe PDF de Satisfacciones

El "Informe PDF" (pestaña Admin → Satisfacciones → Informes, generado por `AdminSatisfaccionReportTab.tsx` + `satisfaccionPdfGenerator.ts`) y la portada compartida con el "Informe Regional" se ven afectados así:

### A. Etiquetas y agrupación de preguntas
Hoy el informe lee siempre `SATISFACCION_FORMS[formType]` (definición **estática**) para:
- Mostrar el texto de cada pregunta/sección en el PDF.
- Agrupar respuestas por sección.
- Calcular promedios Likert, conteos Sí/No/Parcial, frecuencias, etc.

Después del cambio, debe leer la definición **del módulo filtrado** (misma cascada Específico → Global → Default). Si el admin filtra "Todos los módulos", el informe usará la definición global/default para etiquetar.

### B. Preguntas que ya no existen / preguntas nuevas
- **Preguntas eliminadas** en un módulo: ya no aparecen en el PDF de ese módulo, pero las respuestas históricas siguen en `satisfaccion_responses` (se mostrarán bajo "Preguntas no reconocidas" o se omitirán, según prefieras).
- **Preguntas nuevas**: solo tendrán respuestas a partir del momento en que se publican; el PDF mostrará "Sin respuestas" para periodos anteriores.

### C. Claves de pregunta (`key`)
Si el admin **renombra una `key`**, las respuestas previas quedan huérfanas (no se agruparán con las nuevas). Se recomienda:
- Bloquear edición de `key` cuando ya hay respuestas para esa combinación módulo+pregunta, o
- Mostrar advertencia en el editor.

### D. Comentarios narrativos y "Aspectos destacados"
La tabla `satisfaccion_report_content` ya está particionada por `(form_type, module_number, region)`, así que **no requiere migración**. Los textos narrativos seguirán ligados al módulo correspondiente.

### E. Logos y portada
Sin cambios. La portada del PDF (logos extra, región, módulo) sigue funcionando como hoy.

### F. Componentes a actualizar
- `AdminSatisfaccionReportTab.tsx` (líneas 130, 257, 353, 1421): reemplazar `SATISFACCION_FORMS[formType]` por una carga async/memoizada que respete `module_number`.
- `satisfaccionPdfGenerator.ts`: recibir el `formDef` ya resuelto en vez de importarlo del estático.
- `loadFormDefinition()` en `src/data/satisfaccionData.ts`: nueva firma `(formType, moduleNumber, supabaseClient)`.

---

## Acciones por entorno (Render)

- 🖥️ **Site statique (Frontend)** :
  - Modificar `AdminSatisfaccionFormsTab.tsx` (selector de módulo, guardar/cargar por módulo, botón "copiar desde").
  - Modificar `AdminSatisfaccionReportTab.tsx` y `satisfaccionPdfGenerator.ts` para usar la definición específica del módulo.
  - Actualizar `loadFormDefinition()` en `src/data/satisfaccionData.ts` y las páginas `SatisfaccionIntensivo` / `SatisfaccionInterludio`.

- ⚙️ **Web Service (Backend Express)** :
  - Sin cambios de código (la tabla ya está expuesta vía el proxy `dbClient`). Solo verificar que `satisfaccion_form_definitions` siga en la whitelist (ya lo está, líneas 59 y 145 de `server/routes/db.ts`).

- 🗄️ **Base de datos (SQL manual en Render)** :
  ```sql
  ALTER TABLE public.satisfaccion_form_definitions
    ADD COLUMN IF NOT EXISTS module_number INTEGER;

  ALTER TABLE public.satisfaccion_form_definitions
    DROP CONSTRAINT IF EXISTS satisfaccion_form_definitions_form_type_key;

  CREATE UNIQUE INDEX IF NOT EXISTS satisfaccion_form_definitions_type_module_key
    ON public.satisfaccion_form_definitions (form_type, COALESCE(module_number, -1));
  ```
  Esta misma migración debe aplicarse en Supabase (Lovable Cloud) para mantener paridad.
