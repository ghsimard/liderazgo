# Vista previa por módulo + acceso directo al formulario real

## Objetivo

Permitir al administrador previsualizar los formularios de Satisfacción (Asistencia, Interludio, Intensivo) para cualquiera de los 4 módulos sin depender de su activación en la configuración, y abrir el formulario real en una nueva pestaña para validar el flujo completo.

## Cambios

### 1. Selector de Módulo en la Vista Previa

En **Admin → Satisfacciones → Formularios**, añadir un selector compacto **Módulo 1 / 2 / 3 / 4** junto a los botones "Vista previa" / "Editar".

- Estado local `previewModule: number` (default `1`).
- Pasar este valor a los dos puntos donde se instancia `<SatisfaccionForm moduleNumber={…} />` (modo preview inline y diálogo de preview).
- El encabezado del formulario mostrará dinámicamente "Módulo N — (Vista previa)" como ya lo hace hoy.

### 2. Botón "Abrir formulario real"

Añadir, junto al selector de módulo, un botón secundario **"Abrir formulario real"** que abre en una nueva pestaña la URL pública:

```
/satisfaccion-{tipo}?module={N}
```

Esto permite probar el flujo de envío completo (autenticación por cédula, guardado en `satisfaccion_responses`).

> Nota: si el módulo/región no está activado en `satisfaccion_config`, el formulario público mostrará su mensaje de indisponibilidad estándar. El admin lo sabe — es comportamiento esperado para validar la configuración.

## Acciones de despliegue Render

- 🖥️ **Site statique (Frontend)** : redeploy de `AdminSatisfaccionFormsTab.tsx` (único archivo modificado).
- ⚙️ **Web Service (Backend Express)** : ninguna acción.
- 🗄️ **Base de datos (SQL Manual)** : ninguna acción.
