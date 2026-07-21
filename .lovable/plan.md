## Problème

Dans les formulaires Ficha (`AdminEditFicha.tsx` et `FichaRLT.tsx`), les champs à **label flottant** (`FormFieldWrapper` non-`staticLabel`) affichent la valeur qui « écrase » le titre. Le phénomène se voit surtout sur les `<select>` (Lengua materna, Región, Cargo actual) mais s'applique à tous les champs flottants.

## Cause (confirmée par lecture de `src/index.css` L108-207 et `src/components/FormComponents.tsx` L16-46)

Le CSS actuel positionne :
- Le label rétréci à `top: 0.45rem` avec `font-size: 0.68rem`, `line-height: 1` → bord bas du label ≈ 18 px.
- L'input avec `padding-top: 1.5rem` (24 px) et `font-size: 14 px` sur desktop.

Marge visuelle entre le bas du label et le haut du texte de la valeur : ~6 px seulement. Sur `<select>`, plusieurs moteurs (Safari, Chrome selon la fonte) centrent verticalement le texte de l'option et ignorent en partie `padding-top`, ce qui ramène le texte de la valeur par-dessus le label rétréci.

Deuxième effet : `.floating-label` a `white-space: nowrap; text-overflow: ellipsis` ; sur une colonne étroite, un label long (« Lengua materna », « Cargo actual ») peut être tronqué avant même le rétrécissement.

## Fix (CSS uniquement, `src/index.css`)

Modifications ciblées, sans toucher à la logique React ni aux formulaires :

1. **`.form-input`** — augmenter la hauteur utile et le rembourrage haut :
   - `min-height: 52px` (mobile) / `min-height: 48px` (desktop)
   - `padding-top: 1.75rem`
   - `padding-bottom: 0.5rem`
   - Pour `<select>` spécifiquement : ajouter une règle `select.form-input { line-height: 1.2; padding-top: 1.85rem; }` afin de compenser le centrage vertical natif.

2. **`.floating-label` rétréci** (`.field-has-value .floating-label`, `.floating-input:focus ~ .floating-label`, `select.floating-input:focus ~ .floating-label`) :
   - `top: 0.4rem`
   - `font-size: 0.7rem`
   - Garder `line-height: 1`
   - Ajouter `padding-right: 0.5rem` pour éviter que l'ellipsis colle au bord droit.

3. **`.floating-label` (état non rétréci)** :
   - Passer de `white-space: nowrap` à `white-space: nowrap; max-width: calc(100% - 1.5rem);` — l'ellipsis ne change pas, mais on garantit qu'il ne dépasse pas dans la zone de la flèche du `<select>`.

4. **Textarea** (`textarea.floating-input:focus ~ .floating-label`, `.field-has-value textarea ~ .floating-label`) :
   - Aligner sur `top: 0.4rem`, `font-size: 0.7rem` pour la cohérence.

## Vérification

- Recharger `/admin/ficha/…` et `/ficha` : les champs `Lengua materna`, `Región`, `Cargo actual`, `Entidad territorial`, `Municipio`, `Cohorte` doivent afficher clairement le label rétréci au-dessus de la valeur, sans chevauchement.
- Vérifier sur mobile (viewport 375 px) et desktop.
- Vérifier le mode lecture (`ficha-readonly`) — les valeurs restent visibles.
- Vérifier les `<input>` texte (Nombres, Apellidos, Lugar de nacimiento) qui utilisent la même classe.

## Hors périmètre

- Aucune modification de la logique React, des schémas ou de la base.
- Aucune modification des champs `staticLabel` (déjà correctement espacés).
- Aucune modification des PDF.
