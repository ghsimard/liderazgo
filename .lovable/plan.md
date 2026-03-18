

## Normalisation des noms en Title Case

### Probleme
Les utilisateurs saisissent "JUAN CARLOS PÉREZ GÓMEZ" au lieu de "Juan Carlos Pérez Gómez". Aucune transformation n'est appliquée avant la sauvegarde.

### Solution proposee

Ajouter une fonction `toTitleCase` qui transforme chaque mot : premiere lettre en majuscule, le reste en minuscule, en preservant les accents (É→é, etc.).

**Fichier** : `src/pages/FichaRLT.tsx`

1. **Ajouter un helper** `toTitleCase` en haut du fichier :
```typescript
const toTitleCase = (s: string) =>
  s.toLowerCase().replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
```

2. **Appliquer dans `onSubmit`** (lignes 677-679) — transformer `nombres`, `apellidos` et `nombres_apellidos` :
```typescript
const nombres = toTitleCase(data.nombres.trim());
const apellidos = toTitleCase(data.apellidos.trim());
// ...
nombres: nombres,
apellidos: apellidos,
nombres_apellidos: `${nombres} ${apellidos}`,
```

Cela couvre les insertions (creation) et les updates (edition). La transformation est invisible pour l'utilisateur — elle s'applique au moment de la sauvegarde.

### Donnees existantes

Pour corriger les noms deja en base en MAJUSCULES, une requete SQL one-shot peut etre executee :
```sql
UPDATE fichas_rlt
SET nombres = initcap(nombres),
    apellidos = initcap(apellidos),
    nombres_apellidos = initcap(nombres) || ' ' || initcap(apellidos)
WHERE nombres = upper(nombres) OR apellidos = upper(apellidos);
```

### Deploiement

- **🖥️ Site statique** : Oui — rebuild frontend
- **⚙️ Web Service** : Non
- **🗄️ Base de donnees** : Optionnel — requete SQL ci-dessus pour corriger l'existant

