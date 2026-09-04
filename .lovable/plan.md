# Renombrar una institución y propagarlo a toda la aplicación

## Problema constatado

En Fichas de Información > Configuración, cambiar el nombre de una escuela solo actualiza la lista de instituciones (una sola línea de la base). Todo el resto de la aplicación guarda el nombre de la escuela como texto copiado, así que las fichas, encuestas, rúbricas, invitaciones y permisos siguen mostrando el nombre antiguo. Resultado: la escuela aparece duplicada (nombre viejo + nombre nuevo) en filtros, informes y monitoreos.

## Recomendación

Convertir el cambio de nombre en una operación de "renombrar y propagar", con confirmación previa.

### 1. Diálogo de confirmación con vista previa

Al guardar el nuevo nombre, antes de aplicar nada, mostrar:

- Nombre antiguo -> nombre nuevo
- Conteo de registros afectados por área: fichas, encuestas 360, invitaciones, rúbricas (asignaciones), ambiente escolar, cohortes, formularios 2025, permisos de operadores
- Aviso si el nombre nuevo ya existe en la lista (fusión de dos escuelas): pedir confirmación explícita, porque los datos quedarán unidos
- Botones: Cancelar / Renombrar en todo el sistema

### 2. Propagación

Tras confirmar, actualizar el nombre en todas las tablas que lo guardan como texto, y guardar una copia de seguridad del cambio en la Papelera (registro tipo `rename_institucion`) para poder revertirlo.

### 3. Reversión

En la Papelera, el registro de renombrado permite volver al nombre anterior aplicando la misma operación a la inversa.

## Detalles técnicos

Archivo principal: `src/components/admin/AdminGeographyTab.tsx` (línea ~174, `handleEditSave`), que hoy solo hace `update({ nombre })` sobre `instituciones`.

Nueva utilidad `src/utils/renameInstitucion.ts`:

- `countInstitucionReferences(oldName)` — conteos por tabla para la vista previa
- `renameInstitucionEverywhere(oldName, newName)` — actualiza secuencialmente:

```text
instituciones.nombre
fichas_rlt.nombre_ie
encuestas_360.institucion_educativa
encuesta_invitaciones.institucion
rubrica_asignaciones.institucion
encuestas_ambiente_escolar.institucion_educativa
ae_cohorte_instituciones.institucion_educativa
ae_docentes_submissions_2025.institucion_educativa
ae_estudiantes_submissions_2025.institucion_educativa
ae_acudientes_submissions_2025.institucion_educativa
ae_rectores_2025.nombre_de_la_institucion_educativa_en_la_actualmente_desempena_
operator_permissions.institucion
```

Todas pasan por el proxy `@/utils/dbClient` (nada de acceso directo). Antes de implementar hay que confirmar en el proxy Express (`server/routes/db.ts`) que estas tablas aceptan PATCH de administrador; las tablas `ae_*_2025` están hoy en la lista de lectura pública, así que puede hacer falta añadirlas explícitamente a la lista de escritura administrativa. Si es necesario, ese cambio es del Web Service.

Registro en `deleted_records` con `record_type: "rename_institucion"` y `deleted_data: { old_name, new_name, counts }`, y soporte del botón de reversión en `AdminTrashManager.tsx`.

## Acciones de despliegue

- Site statique (Frontend): nueva utilidad + diálogo de confirmación + reversión en Papelera.
- Web Service (Backend Express): solo si hay que ampliar la lista de tablas con escritura administrativa (`ae_*_2025`).
- Base de datos: ninguna migración. Los datos existentes con nombre antiguo se corrigen desde la interfaz al renombrar.
