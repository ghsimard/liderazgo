# Corrección de las respuestas Logística (módulos 3 y 4)

## Objetivo

En el formulario Intensivo, sección Logística, varias personas marcaron "Totalmente en desacuerdo" (valor 1) cuando querían marcar "Totalmente de acuerdo" (valor 4), por el orden anterior de las columnas.

Corrección acordada:
- Solo la pregunta `logistica` (filas `log_*`).
- Solo los módulos 3 y 4 del formulario `intensivo`.
- Solo los valores `1` pasan a `4`. Los valores 2, 3 y 4 no se tocan.
- Todas las regiones y todas las fechas.

## Cómo se hace

No hay cambios de código: es una corrección de datos en la tabla `satisfaccion_responses`, campo JSONB `respuestas` → clave `logistica`.

Pasos del script SQL:

1. Crear una tabla de respaldo `_undo_satisfaccion_logistica_20260829` con el `id` y el JSON original de cada fila afectada (permite deshacer).
2. Reconstruir el objeto `logistica` reemplazando cada valor `"1"` por `"4"`, conservando las demás filas y claves intactas.
3. Consulta de verificación: conteo por valor antes / después.

## Detalles técnicos

- Solo se modifican filas donde `form_type = 'intensivo'` y `module_number IN (3,4)` y `respuestas->'logistica'` contiene al menos un valor `"1"`.
- El resto del JSON (`autoevaluacion`, comentarios, etc.) no se toca.
- Undo disponible: restaurar `respuestas` desde la tabla de respaldo por `id`.

## Acciones necesarias

- 🖥️ Site statique (Frontend) : rien.
- ⚙️ Web Service (Backend Express) : rien.
- 🗄️ Base de datos : ejecutar manualmente el script SQL en producción (te lo entrego listo para copiar/pegar tras la aprobación). La base de desarrollo no tiene respuestas de intensivo, así que allí no hay nada que corregir.
