

## Plan: Masquer "Todas las regiones" et pré-sélectionner la région unique

### Problème
Quand un opérateur n'a qu'une seule région autorisée, le dropdown affiche un champ vide avec "Todas las regiones" dans la liste. Il devrait voir uniquement sa région, pré-sélectionnée.

### Solution

Deux corrections dans chaque composant utilisant `allowedRegions` :

1. **Masquer l'option "Todas las regiones"** quand `allowedRegions?.length === 1`
2. **S'assurer que la région est pré-sélectionnée** dès l'initialisation

### Fichiers modifiés (7 composants)

| Composant | Correction |
|---|---|
| `AdminAsistenciaTab` | Cacher `<SelectItem value="all">` si `allowedRegions?.length === 1` ; initialiser `selectedRegion` avec `allowedRegions[0]` si length === 1 |
| `AdminRubricasTab` | Idem (déjà initialisé correctement, juste masquer l'option "all") |
| `AdminEncuestas360Tab` | Idem |
| `AdminFichasTab` | MultiSelect — si 1 seule région, pré-sélectionner `selRegions` |
| `AdminAmbienteMonitorTab` | Cacher option "all" + auto-select |
| `AdminSatisfaccionesTab` | Idem selon le type de Select utilisé |
| `AdminMelTab` | MultiSelect — pré-sélectionner si 1 seule région |
| `AdminInformeModuloForm` | Déjà géré, vérifier cohérence |
| `AdminEvalIndividualTab` | Déjà géré, vérifier cohérence |
| `AdminInformeReportTab` | Vérifier cohérence |

### Pattern de correction (Select simple)
```tsx
{!(allowedRegions?.length === 1) && (
  <SelectItem value="all">Todas las regiones</SelectItem>
)}
```

### Pattern de correction (MultiSelect)
Initialiser `selRegions` avec `allowedRegions` quand `length === 1`.

### Impact
- Aucune migration
- L'admin continue de voir "Todas las regiones" (car `allowedRegions` est undefined/vide pour l'admin)

