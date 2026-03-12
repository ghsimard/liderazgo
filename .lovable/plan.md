

## Diagnostic

The Region field appears empty because of a **race condition** between two async operations:

1. `useGeographicData()` fetches regions from the database (takes time)
2. The ficha-loading `useEffect` (line 462) runs immediately and calls `reset(formData)` with the region value

The problem: the `useEffect` at line 462 does **not** depend on `geo.loading`. It runs before `geo.regionNames` is populated. So:
- `geo.getEntidadesForRegion(region)` returns `[]` (regiones array is empty)
- `geo.getMunicipiosForRegion(region)` returns `[]`
- The `<FormSelect>` for region has no `options` yet when the form value is set
- When geo data finally loads, the select gets its options but the dependent logic (entidad, municipio) was already run against empty data

## Fix

**File: `src/pages/AdminEditFicha.tsx`**

Add `geo.loading` as a dependency to the ficha-loading useEffect (line 462), and skip execution while geo is still loading:

```typescript
useEffect(() => {
  if (isCreateMode || !id || !isAdmin) return;
  if (geo.loading) return;  // ← wait for geographic data
  (async () => {
    // ... existing ficha load logic
  })();
}, [id, isAdmin, geo.loading]);  // ← add geo.loading dependency
```

This ensures the ficha data is loaded and the form is reset **only after** geographic data is available, so the region select has its options and the entidad/municipio cascading logic works correctly.

