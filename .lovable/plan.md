

## Plan: Restreindre les régions visibles pour les opérateurs

### Problème
Le panel opérateur (`OperadorPanel`) affiche les composants admin (Asistencia, Rúbricas, Encuesta 360, etc.) sans aucun filtrage régional. Un opérateur voit toutes les régions dans les menus déroulants et toutes les données, alors qu'il ne devrait voir que les régions assignées dans `operator_permissions`.

### Solution

**Étape 1 — Extraire les régions autorisées dans `OperadorPanel.tsx`**

Calculer un tableau `allowedRegions` à partir des permissions de l'opérateur pour la section active :
```typescript
const allowedRegions = [...new Set(
  permissions.filter(p => p.section === activeSection && p.region)
    .map(p => p.region!)
)];
```
Passer ce tableau comme prop à chaque sous-composant.

**Étape 2 — Ajouter la prop `allowedRegions` à 7 composants**

Chaque composant reçoit `allowedRegions?: string[]`. Quand elle est fournie et non vide :
- Le menu déroulant des régions n'affiche que ces régions
- Les données sont automatiquement filtrées côté client
- L'option "Todas las regiones" devient "toutes les régions autorisées" (filtre implicite)

Composants à modifier :

| Composant | Mécanisme de filtre actuel |
|---|---|
| `AdminAsistenciaTab` | `regiones` state → filtrer la liste |
| `AdminRubricasTab` | `regiones` state → filtrer la liste |
| `AdminEncuestas360Tab` | `regiones` state → filtrer la liste + `instRegionMap` |
| `AdminFichasTab` | `regionOptions` memo → filtrer les options |
| `AdminAmbienteMonitorTab` | `regionNames` du hook → filtrer la liste |
| `AdminSatisfaccionesTab` | `regions` state → filtrer la liste + configs |
| `AdminMelTab` | `regionOptions` memo → filtrer les options |

Pour chaque composant, le pattern est identique :
1. Ajouter `allowedRegions?: string[]` aux props
2. Après le chargement des régions, filtrer : `const effectiveRegions = allowedRegions?.length ? regions.filter(r => allowedRegions.includes(r)) : regions`
3. Utiliser `effectiveRegions` dans le rendu du Select et dans le filtrage des données
4. Si une seule région autorisée, la pré-sélectionner automatiquement

**Étape 3 — Passer les props dans `OperadorPanel.tsx`**

```typescript
case "asistencia":
  return <AdminAsistenciaTab allowedRegions={allowedRegions} />;
case "rubricas":
  return <AdminRubricasTab allowedRegions={allowedRegions} />;
// ... etc pour les 7 composants
```

### Fichiers modifiés
- `src/pages/OperadorPanel.tsx`
- `src/components/admin/AdminAsistenciaTab.tsx`
- `src/components/admin/AdminRubricasTab.tsx`
- `src/components/admin/AdminEncuestas360Tab.tsx`
- `src/components/admin/AdminFichasTab.tsx`
- `src/components/admin/AdminAmbienteMonitorTab.tsx`
- `src/components/admin/AdminSatisfaccionesTab.tsx`
- `src/components/admin/AdminMelTab.tsx`

### Impact
- Aucune migration de base de données
- Les composants restent fonctionnels sans la prop (usage admin classique inchangé)

