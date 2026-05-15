# Problema: Operadora no puede ver Asistencia en Render (prod)

## Causa raíz

En el panel del Operador, la app llama:

```ts
supabase.from("operator_permissions").select("*").eq("cedula", cedula)
```

En **Render (producción)**, ese `supabase` es el proxy Express (`@/utils/dbClient`). El proxy en `server/routes/db.ts` define una lista blanca llamada `PUBLIC_READ_TABLES` — tablas que se pueden leer sin token JWT.

**`operator_permissions` NO está en esa lista** → Express devuelve **401 "Authentification requise"** porque el operador se identifica solo con `user_cedula` en sessionStorage (no tiene `auth_token` JWT).

Resultado: `permissions = []` → el panel muestra *"No tiene permisos asignados"* o, si el caché tenía algo, las tarjetas (Asistencia, etc.) no aparecen. En preview de Lovable funciona porque ahí el dbClient usa Supabase directo y las políticas RLS son distintas.

Las tablas que Asistencia consume (`fichas_rlt`, `informe_asistencia`) **sí** están en `PUBLIC_READ_TABLES`, así que en cuanto se arregle el primer paso, todo lo demás carga.

## Cambio propuesto

### ⚙️ Web Service (Backend Express, server/routes/db.ts)

Añadir `operator_permissions` a `PUBLIC_READ_TABLES` para que la lectura por cédula funcione sin JWT (igual que ya hacen `fichas_rlt`, `informe_asistencia`, etc.).

```ts
const PUBLIC_READ_TABLES = new Set([
  ...,
  "operator_permissions",   // ← añadir
]);
```

Las escrituras (insert/update/delete) **siguen requiriendo Admin/Superadmin** porque no se tocan las listas `PUBLIC_INSERT_TABLES`, `PUBLIC_UPDATE_TABLES`, `PUBLIC_DELETE_TABLES`.

### 🖥️ Site statique (Frontend)
Ningún cambio.

### 🗄️ Base de datos (SQL manual)
Ningún cambio (la tabla ya existe y su RLS en Supabase es independiente del proxy Render).

## Riesgo

Mínimo. La tabla solo contiene asignaciones de permisos (cédula + sección + región). No expone PII sensible. La cédula se usa como filtro `.eq("cedula", ...)` desde el cliente; cualquiera puede consultar permisos de cualquier cédula, lo cual es aceptable dado que ya es el patrón actual para `fichas_rlt` y otras tablas operativas.

## Despliegue

Después de mergear el cambio en GitHub, Render redeploya el Web Service automáticamente. No hay migración SQL.
