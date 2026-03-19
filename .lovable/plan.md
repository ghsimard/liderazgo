

## Plan: Asistencia par jour avec tous les filtres

### Problème actuel
- `informe_asistencia` n'a pas de champ `region`/`institucion` — le filtrage géographique est absent
- Le calcul montre un seul % global au lieu d'un % par jour
- Le champ `dia` (1, 2, 3...) existe dans la table mais n'est pas récupéré

### Solution

**1. Fetch enrichi** — Ajouter `dia` au select de `informe_asistencia`

**2. Filtrage géographique via fichas_rlt** — Construire un mapping `cedula → institution` depuis les fichas déjà chargées, puis filtrer l'asistencia :
- Si filtre **institución** : ne garder que les cédulas de cette institution
- Si filtre **región** (sans institution) : ne garder que les cédulas des institutions de la région (via `instForRegion`)

**3. Calcul par jour** — Grouper les enregistrements filtrés par `dia`, calculer pour chaque jour :
- `total` = nombre de directivos avec un enregistrement ce jour
- `present` = ceux avec `session_am === true`
- `rate` = `(present / total) * 100`

**4. Visualisation** — Remplacer le bloc statique par un `BarChart` montrant le % de présence par jour (Día 1, Día 2, etc.), avec le taux global en sous-titre.

### Fichier modifié
`src/components/admin/AdminDashboardTab.tsx` :
- Ligne 55 : ajouter `dia` au select
- Ligne 87 (fichaMap) : corriger pour utiliser le bon champ (`numero_cedula` n'est pas dans le select actuel — l'ajouter au fetch fichas)
- Lignes 137-141 : filtrer par module ET par géographie via le mapping cedula→institution
- Lignes 206-211 : calcul par jour au lieu d'un seul agrégat
- Lignes 291-301 : BarChart par jour au lieu du bloc statique

### Détail technique

Le fetch fichas actuel ne sélectionne pas `numero_cedula`. Il faut l'ajouter pour que le mapping cedula→institution fonctionne :
```
supabase.from("fichas_rlt").select("id, region, cargo_actual, nombre_ie, numero_cedula")
```

Le filteredAsistencia appliquera tous les filtres :
```typescript
const filteredAsistencia = useMemo(() => {
  let r = asistencia;
  if (filters.modulo) r = r.filter(x => String(x.module_number) === filters.modulo);
  // Geographic filter via cedula→institution mapping
  if (filters.institucion) {
    const ceds = new Set(fichas.filter(f => f.nombre_ie === filters.institucion).map(f => f.numero_cedula));
    r = r.filter(x => ceds.has(x.directivo_cedula));
  } else if (instForRegion) {
    const ceds = new Set(fichas.filter(f => instForRegion.includes(f.nombre_ie)).map(f => f.numero_cedula));
    r = r.filter(x => ceds.has(x.directivo_cedula));
  }
  return r;
}, [asistencia, filters, instForRegion, fichas]);
```

Le calcul par jour :
```typescript
const asistenciaByDay = useMemo(() => {
  const days: Record<number, { total: number; present: number }> = {};
  filteredAsistencia.forEach(a => {
    if (!days[a.dia]) days[a.dia] = { total: 0, present: 0 };
    days[a.dia].total++;
    if (a.session_am) days[a.dia].present++;
  });
  return Object.entries(days)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([dia, v]) => ({ name: `Día ${dia}`, rate: Math.round((v.present / v.total) * 100) }));
}, [filteredAsistencia]);
```

La card affichera un BarChart avec les jours en X et le % en Y.

