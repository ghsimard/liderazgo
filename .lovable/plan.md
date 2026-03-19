

## Probleme identifie

Le calcul d'asistencia dans le Tablero de Control est **incorrect** car il ne compte que les enregistrements existants. Le denominateur devrait etre le **nombre total de directivos**, pas le nombre d'enregistrements pour ce jour.

**Donnees actuelles en base :**
- 2 directivos (cedulas 11111111 et 22222222)
- 6 enregistrements, tous avec `session_am=true`
- Directivo 11111111 : jours 1, 3 (absent jours 2, 4, 5 → pas d'enregistrement)
- Directivo 22222222 : jours 2, 3, 4, 5 (absent jour 1 → pas d'enregistrement)

**Ce que le dashboard affiche :** 100% pour chaque jour (car il divise les presents par les enregistrements existants)

**Ce qui est correct :**
- Jour 1 : 1/2 = 50%
- Jour 2 : 1/2 = 50%
- Jour 3 : 2/2 = 100%
- Jour 4 : 1/2 = 50%
- Jour 5 : 1/2 = 50%

## Solution

Modifier `AdminDashboardTab.tsx` :

1. **Calculer le nombre total de directivos filtrés** a partir de `filteredFichas` (en ne gardant que Rector/a et Coordinador/a)
2. **Pour chaque jour**, diviser le nombre d'enregistrements avec `session_am=true` par le nombre total de directivos (pas par le nombre d'enregistrements)
3. **Mettre a jour les stats globales** : total = directivos × jours avec enregistrements, ou afficher "X directivos" au lieu de "X registros"

### Changement technique

```typescript
// Nombre de directivos filtrés (ceux qui sont Rector/a ou Coordinador/a)
const totalDirectivos = useMemo(() => {
  const ceds = new Set<string>();
  filteredFichas
    .filter(f => ['Rector/a', 'Coordinador/a'].includes(f.cargo_actual))
    .forEach(f => { if (f.numero_cedula) ceds.add(f.numero_cedula); });
  return ceds.size;
}, [filteredFichas]);

// Calcul corrigé par jour
const asistenciaByDay = useMemo(() => {
  if (!totalDirectivos) return [];
  const days: Record<number, number> = {};
  filteredAsistencia.forEach(a => {
    if (a.session_am) days[a.dia] = (days[a.dia] || 0) + 1;
  });
  return Object.entries(days)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([dia, present]) => ({
      name: `Día ${dia}`,
      rate: Math.round((present / totalDirectivos) * 100),
      present,
      total: totalDirectivos,
    }));
}, [filteredAsistencia, totalDirectivos]);
```

### Fichier modifie
`src/components/admin/AdminDashboardTab.tsx` — correction du calcul `asistenciaByDay` et `asistenciaStats`

