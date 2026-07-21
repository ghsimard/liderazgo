## Objectif

Dans `src/pages/FichaRLT.tsx`, transformer tous les champs numériques des sections 5 (sedes rural/urbana), 6 (personal) et 7 (estudiantes por nivel) en **inputs simples** (sans label flottant, sans conteneur `static-field` custom), avec **maximum 4 chiffres**.

## Actions

🖥️ **Site statique (Frontend) uniquement**

Fichier : `src/pages/FichaRLT.tsx`

1. **Section 5 — Sedes rural / urbana (lignes 1560, 1567)**
   - `max={999}` → `max={9999}`
   - Ajouter `maxLength={4}`, `inputMode="numeric"`, `pattern="[0-9]*"`
   - Ajouter un `onInput` qui tronque à 4 chiffres (car `maxLength` n'agit pas sur `type="number"`)

2. **Section 6 — Personal (lignes 1646-1660)**
   - Remplacer les 4 `FormFieldWrapper` + `FormInput` (qui utilisent label flottant) par une structure simple label-à-gauche / input-à-droite identique à la Section 5, avec input natif `<input>` sans classes de floating label.
   - `max={9999}`, `maxLength=4`, troncature onInput.

3. **Section 7 — Estudiantes por nivel (lignes 1685-1708)**
   - Retirer la classe `static-field` du conteneur parent (ligne 1681) pour supprimer le padding vertical asymétrique hérité.
   - Ajouter `max={9999}`, `maxLength=4`, troncature onInput sur l'input.
   - Garder la logique de sync `niveles_educativos`.

## Détails techniques

- Utiliser un handler local `handleMax4 = (e) => { if (e.target.value.length > 4) e.target.value = e.target.value.slice(0,4); }` combiné à l'`onChange` de `register` via `setValueAs` ou l'option `onChange` de RHF.
- Style commun : `className="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"` (input simple, centré, hauteur réduite, pas de floating label).
- Aucun changement backend, aucune migration DB, aucun changement de schéma Zod (les champs restent des strings numériques).

## Vérification

- Ouvrir la Ficha RLT sur Safari desktop + mobile, sections 5/6/7.
- Confirmer : valeur centrée verticalement, saisie limitée à 4 chiffres, aucun chevauchement de label.