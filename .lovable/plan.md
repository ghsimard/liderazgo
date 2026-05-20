# Edición de formularios de Satisfacción por módulo (overrides)

## Objetivo

Permitir que el administrador edite, de forma independiente, el formulario de cada Módulo (1-4) para los tres `form_type` (Asistencia, Interludio, Intensivo). Las definiciones actuales se conservan como **base compartida**; cada módulo puede tener un **override opcional** que la reemplaza.

## Comportamiento funcional

- **Definición de base** (`module_number IS NULL`) : una por `form_type`. Es lo que existe hoy.
- **Override de módulo** (`module_number ∈ {1, 2, 3, 4}`) : opcional, una por `(form_type, module_number)`. Si existe, sustituye a la base para ese módulo.
- **Resolución en frontend público (`SatisfaccionPage.tsx`)** : al renderizar el formulario para un directivo, buscar primero el override para `(form_type, module_number)`. Si no existe, usar la definición de base. Si no hay base tampoco, usar el `DEFAULT_FORMS` del código.
- **Admin → Satisfacciones → Formularios** :
  - El selector existente "Módulo 1/2/3/4" pasa a controlar también la **carga y edición** (no solo la vista previa).
  - Indicador visual del estado: badge **"Base compartida"** (módulo = base) o **"Override Módulo N"** (módulo específico activo) o **"Hereda de la base"** (módulo sin override).
  - Botón **"Crear override desde la base"** cuando no existe override para el módulo seleccionado.
  - Botón **"Eliminar override"** cuando existe, para volver a heredar de la base.
  - Botón **"Editar base compartida"** (toggle a `module_number = NULL`) para editar la definición común.

## Cambios

### 1. 🗄️ Base de datos (Migration Supabase + SQL Manual Render)

```sql
-- 1. Añadir la columna módulo (nullable = base compartida)
ALTER TABLE public.satisfaccion_form_definitions
  ADD COLUMN module_number integer;

-- 2. Eliminar la restricción única antigua sobre form_type
ALTER TABLE public.satisfaccion_form_definitions
  DROP CONSTRAINT IF EXISTS satisfaccion_form_definitions_form_type_key;

-- 3. Una sola base por form_type (cuando module_number es NULL)
CREATE UNIQUE INDEX satisfaccion_form_definitions_base_unique
  ON public.satisfaccion_form_definitions (form_type)
  WHERE module_number IS NULL;

-- 4. Un solo override por (form_type, module_number)
CREATE UNIQUE INDEX satisfaccion_form_definitions_override_unique
  ON public.satisfaccion_form_definitions (form_type, module_number)
  WHERE module_number IS NOT NULL;

-- 5. Validar rango del módulo
ALTER TABLE public.satisfaccion_form_definitions
  ADD CONSTRAINT satisfaccion_form_definitions_module_check
  CHECK (module_number IS NULL OR module_number BETWEEN 1 AND 4);
```

Las filas existentes quedan automáticamente con `module_number = NULL` → se convierten en **definiciones de base**. Ninguna respuesta ya enviada se ve afectada (la tabla `satisfaccion_responses` es independiente).

### 2. 🖥️ Site statique (Frontend)

- **`AdminSatisfaccionFormsTab.tsx`** :
  - Hacer que `previewModule` controle también la carga (`loadFormDef(selectedType, previewModule)`).
  - Nuevo botón toggle **"Base / Módulo N"** y selector explícito de qué editar.
  - `loadFormDef` busca primero `(form_type, module_number)`, si no existe, intenta `(form_type, NULL)` y muestra "Hereda de la base".
  - `handleSave` upsertea con la columna `module_number` adecuada.
  - Botones **"Crear override desde la base"** (clona los campos y guarda con `module_number = N`) y **"Eliminar override"** (DELETE con `module_number = N`).
- **`SatisfaccionPage.tsx`** (formulario público para el directivo) :
  - Cargar la definición personalizada antes de renderizar : intentar override por módulo, sino base, sino fallback al `DEFAULT_FORMS` ya importado.
  - Pasar `formDef` resuelto a `<SatisfaccionForm />` (hoy usa `SATISFACCION_FORMS[formType]` estático).

### 3. ⚙️ Web Service (Backend Express)

Ninguna acción. La tabla `satisfaccion_form_definitions` ya está en `ALLOWED_TABLES` y el proxy PostgREST acepta la nueva columna sin cambios de código.

## Acciones de despliegue Render

- 🗄️ **Base de datos (SQL Manual)** : ejecutar el bloque SQL anterior en la base Render (los `CREATE UNIQUE INDEX` y `CHECK` después del `ALTER TABLE`).
- 🖥️ **Site statique (Frontend)** : redeploy de `AdminSatisfaccionFormsTab.tsx` y `SatisfaccionPage.tsx`.
- ⚙️ **Web Service (Backend Express)** : ninguna acción.

## Verificación post-despliegue

1. Admin → Satisfacciones → Formularios → seleccionar "Intensivo" + Módulo 2 → debe mostrar "Hereda de la base".
2. Clic en "Crear override desde la base", modificar una pregunta, guardar → badge cambia a "Override Módulo 2".
3. Volver a Módulo 1 → debe seguir mostrando la base original.
4. Abrir `/satisfaccion-intensivo?module=2` como directivo → debe mostrar la pregunta modificada.
5. Abrir `/satisfaccion-intensivo?module=1` → debe mostrar la versión original.
6. Volver al admin, clic "Eliminar override" en Módulo 2 → vuelve a heredar de la base.
