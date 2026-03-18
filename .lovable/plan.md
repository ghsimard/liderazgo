

## Supprimer les espaces en trop dans les noms

### Changement

Modifier la fonction `toTitleCase` dans `src/pages/FichaRLT.tsx` (ligne 26-27) pour compresser les espaces multiples en un seul avant la conversion :

```typescript
const toTitleCase = (s: string) =>
  s.trim().replace(/\s+/g, " ").toLowerCase().replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
```

Cela transforme `"  JUAN   CARLOS  "` → `"Juan Carlos"`.

Aucun autre fichier à modifier — le `.trim()` aux lignes 680-682 est déjà présent mais ne gère pas les espaces internes.

### Déploiement

- **🖥️ Site statique** : Oui — rebuild frontend
- **⚙️ Web Service** : Non
- **🗄️ Base de données** : Optionnel — pour nettoyer l'existant :
  ```sql
  UPDATE fichas_rlt
  SET nombres = initcap(trim(regexp_replace(nombres, '\s+', ' ', 'g'))),
      apellidos = initcap(trim(regexp_replace(apellidos, '\s+', ' ', 'g'))),
      nombres_apellidos = initcap(trim(regexp_replace(nombres, '\s+', ' ', 'g'))) || ' ' || initcap(trim(regexp_replace(apellidos, '\s+', ' ', 'g')))
  WHERE nombres ~ '\s{2,}' OR apellidos ~ '\s{2,}';
  ```

