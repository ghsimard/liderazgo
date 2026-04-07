

## Plan: Parser les champs JSONB renvoyés comme chaînes par le proxy Express

### Problème
Sur production (Render), le proxy Express renvoie les colonnes JSONB comme des **chaînes JSON** au lieu d'objets JavaScript parsés. Le code fait un simple cast TypeScript (`as AjusteActividad[]`) qui ne parse rien — le résultat est une string, et `.map()` échoue.

### Solution
Ajouter une fonction utilitaire `parseJson` et l'appliquer à tous les champs JSONB lors du chargement des données (lignes 221-234).

### Fichier modifié
`src/pages/InformeModulo.tsx`

### Détail technique

Ajouter un helper en haut du fichier :
```typescript
function parseJson<T>(val: unknown, fallback: T): T {
  if (Array.isArray(val) || (val !== null && typeof val === "object")) return val as T;
  if (typeof val === "string") {
    try { return JSON.parse(val) as T; } catch { return fallback; }
  }
  return fallback;
}
```

L'appliquer aux 5 champs JSONB (lignes 221-234) :
- `ajustes_actividades` → `parseJson<AjusteActividad[]>(row.ajustes_actividades, [])`
- `sesiones_programadas` → `parseJson<SesionesProgramadas>(row.sesiones_programadas, {...EMPTY_SESIONES})`
- `sesiones_realizadas` → `parseJson<SesionesProgramadas>(row.sesiones_realizadas, {...EMPTY_SESIONES})`
- `acompanamiento_directivos` → `parseJson<AcompanamientoDirectivo[]>(row.acompanamiento_directivos, [])`
- `estrategias` → `parseJson<Estrategia[]>(row.estrategias, [...DEFAULT_ESTRATEGIAS])`
- `novedades` → `parseJson<Novedad[]>(row.novedades, [])`

### Impact
- Frontend uniquement
- Aucune migration
- Redéployer le **site statique** sur Render

