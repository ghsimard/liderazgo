## Objectif

Pour Quibdó 2026, autoriser trois rôles dans le champ "Cargo actual" au lieu de forcer "Rector/a" :
- Rector/a
- Director/a rural
- Director/a de núcleo

## Modification

**Fichier :** `src/pages/FichaRLT.tsx` (lignes 1442-1462)

Remplacer la branche `regionSeleccionada === "Quibdó 2026"` (input désactivé forçant Rector/a) par un `FormSelect` limité à ces trois options. La branche "autres régions" garde ses 4 options (incluant Coordinador/a).

```tsx
) : regionSeleccionada === "Quibdó 2026" ? (
  <FormSelect
    id="cargo_actual"
    {...register("cargo_actual")}
    hasError={!!err("cargo_actual")}
    options={[
      { value: "Rector/a", label: genderizeRole("Rector/a", watch("genero")) },
      { value: "Director/a rural", label: genderizeRole("Director/a rural", watch("genero")) },
      { value: "Director/a de núcleo", label: genderizeRole("Director/a de núcleo", watch("genero")) },
    ]}
  />
) : (
  // ... 4 options existantes inchangées
)
```

## Actions de déploiement

- 🖥️ **Site statique (Frontend)** : déploiement auto via Lovable. Aucune action manuelle.
- ⚙️ **Web Service (Backend Express)** : aucune action.
- 🗄️ **Base de données** : aucune action (le champ `cargo_actual` accepte déjà ces valeurs).

## Vérifier également ?

Souhaites-tu que j'applique la même restriction (3 options au lieu de 4, donc retrait de "Coordinador/a") dans `src/pages/AdminEditFicha.tsx` pour les fiches Quibdó éditées côté admin ? Sinon je touche uniquement `FichaRLT.tsx`.