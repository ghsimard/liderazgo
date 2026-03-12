

## Problème identifié

**Cause racine** : Le driver PostgreSQL pour Node.js (`node-pg`) convertit les colonnes de type `DATE` en objets JavaScript `Date`. Lors de la sérialisation JSON, ces valeurs deviennent des chaînes ISO complètes comme `"1974-02-16T00:00:00.000Z"`.

Le composant `DatePickerField` fait `new Date(value + "T12:00:00")`, ce qui produit une chaîne invalide : `"1974-02-16T00:00:00.000ZT12:00:00"` → les dates ne sont pas parsées et les champs restent vides.

En mode Supabase (preview Lovable), PostgREST retourne les dates au format `"1974-02-16"` → ça fonctionne.

## Solution

**Fichier** : `src/pages/AdminEditFicha.tsx`

Normaliser la valeur d'entrée dans `DatePickerField.getparts()` et dans le `useEffect` pour extraire uniquement la partie `yyyy-MM-dd` avant de parser :

```typescript
// Extraire yyyy-MM-dd d'une chaîne ISO ou date simple
const normalizeDate = (v: string) => v ? v.substring(0, 10) : "";
```

Appliquer `normalizeDate(value)` dans :
1. `getparts()` (ligne 110) : `const parsed = new Date(normalizeDate(v) + "T12:00:00");`
2. `useEffect` (ligne 122) : `const d = new Date(normalizeDate(value) + "T12:00:00");`

Cela gère les deux formats (`"1974-02-16"` et `"1974-02-16T00:00:00.000Z"`) sans casser le mode Supabase.

**Impact** : Frontend uniquement. Le Static Site sur Render devra être redéployé. Aucune modification serveur.

