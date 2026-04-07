

## Plan: Fix "invalid input syntax for type json" in Express DB proxy

### Problem
On production (Render), saving an Informe de Módulo fails with "invalid input syntax for type json". The Express DB proxy (`server/routes/db.ts`) passes JavaScript objects directly as `pg` query parameters. The `node-pg` library does NOT auto-stringify objects — it calls `.toString()`, producing `[object Object]`, which PostgreSQL rejects as invalid JSON.

This affects all jsonb columns: `ajustes_actividades`, `estrategias`, `novedades`, `sesiones_programadas`, `sesiones_realizadas`, `acompanamiento_directivos`.

### Solution
In `server/routes/db.ts`, serialize any object/array values to JSON strings before passing them as `pg` parameters. This applies to both INSERT (line ~492) and UPDATE/PATCH (line ~526) code paths.

### File modified
`server/routes/db.ts`

### Technical detail
Add a helper function:
```typescript
function pgValue(val: any): any {
  if (val !== null && typeof val === "object" && !(val instanceof Date)) {
    return JSON.stringify(val);
  }
  return val;
}
```

Apply it in:
1. **INSERT path** (line 492): `const vals = cols.map((c) => pgValue(row[c]));`
2. **PATCH path** (line 526): `params.push(pgValue(body[col]));`

### Impact
- Server-side only (`server/routes/db.ts`)
- No migration needed
- Requires redeployment on Render

