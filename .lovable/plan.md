

## Diagnostic: Rubricas/Resultados shows CC instead of names on Render

### Root cause analysis

The component `AdminRubricasTab.tsx` builds a `cedulaToName` map from `rubrica_asignaciones.directivo_nombre`. The display logic is:

```typescript
cedulaToName[ced] ? cedulaToName[ced] : `CC: ${ced}`
```

Two possible causes on Render:

1. **Data issue**: The `directivo_nombre` values in the Render PostgreSQL database are empty strings (`""`). Since empty string is falsy in JavaScript, the condition falls through to `"CC: ${ced}"`. The Supabase (Lovable Cloud) database likely has the names populated correctly.

2. **Missing asignaciones**: Some `directivo_cedula` values in `rubrica_evaluaciones` may not have a corresponding row in `rubrica_asignaciones` on Render, so they never get a name mapping.

### Proposed fix

Make the name resolution more resilient by adding a fallback to `fichas_rlt` (which always contains names). In `AdminRubricasTab.tsx`:

1. **Add a secondary name lookup from `fichas_rlt`**: Query `fichas_rlt` for `numero_cedula` and `nombres_apellidos` for all cedulas found in evaluaciones.
2. **Merge both sources into `cedulaToName`**: Use `rubrica_asignaciones.directivo_nombre` as primary, then fill gaps from `fichas_rlt.nombres_apellidos`.
3. **Handle empty strings**: Change the display condition to also treat empty strings as missing: `cedulaToName[ced]?.trim()` instead of just `cedulaToName[ced]`.

### Technical details

In `loadData()`, add a query to `fichas_rlt`:
```typescript
const { data: fichas } = await supabase
  .from("fichas_rlt")
  .select("numero_cedula, nombres_apellidos");
```

Build the map with fallback:
```typescript
const map: Record<string, string> = {};
// Primary: fichas_rlt
fichas?.forEach(f => { if (f.nombres_apellidos) map[f.numero_cedula] = f.nombres_apellidos; });
// Override with asignaciones if available
asignaciones?.forEach(a => { if (a.directivo_nombre) map[a.directivo_cedula] = a.directivo_nombre; });
setCedulaToName(map);
```

Note: `fichas_rlt` is already in `PUBLIC_READ_TABLES` on the Express proxy, so no server-side changes are needed.

