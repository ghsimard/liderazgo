

## Plan: Supprimer l'heure des dates dans le PDF de Ficha

### Problème

La fonction `val()` dans `pdfGenerator.ts` (ligne 197) fait un simple `String(v)` sur les valeurs brutes de la base de données. Les champs date arrivent au format ISO (`2024-05-15T00:00:00.000Z`), ce qui affiche la date **avec l'heure** dans le PDF.

Les champs affectés :
- `fecha_nacimiento`
- `fecha_vinculacion_servicio`
- `fecha_nombramiento_cargo`
- `fecha_nombramiento_ie`

### Solution

Ajouter une fonction utilitaire `formatDateOnly` dans `pdfGenerator.ts` qui détecte les chaînes ISO date et les reformate en `dd/mm/yyyy`. Puis l'appliquer dans les appels `val()` pour ces 4 champs date.

```typescript
const formatDateOnly = (v: string): string => {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
};
```

Modifier les lignes 207, 224-226 pour utiliser `formatDateOnly` :
- `val("fecha_nacimiento")` → `val("fecha_nacimiento") ? formatDateOnly(val("fecha_nacimiento")!) : undefined`
- Idem pour les 3 autres champs date

### Fichier modifié

- `src/utils/pdfGenerator.ts`

