# Correction : chiffres mal centrés — Section 7 (Estudiantes por nivel educativo)

## Diagnostic confirmé

Les compteurs d'élèves de la section 7 utilisent `<input className="form-input w-20 text-center">` sans wrapper `FormFieldWrapper` / floating-label. Or `.form-input` (dans `src/index.css`) applique `padding-top: 1.5rem; padding-bottom: 0.4rem` pour laisser la place au label flottant. Sans label, le chiffre "0" apparaît collé en bas du champ au lieu d'être centré verticalement.

Un correctif similaire existe déjà pour les champs avec `staticLabel` (`.static-field .form-input { padding-top: 0.5rem; padding-bottom: 0.5rem }`), mais il n'est pas appliqué ici parce que l'input n'est pas dans un `FormFieldWrapper`.

## Modification

Ajouter à la section 7 la classe utilitaire Tailwind `!py-2` (ou l'ajout d'un wrapper `static-field`) sur les 6 inputs numériques pour rétablir un padding vertical symétrique et centrer le chiffre.

Approche retenue : ajouter la classe `static-field` sur le conteneur `div` de chaque ligne — c'est déjà le mécanisme utilisé ailleurs dans le projet pour neutraliser le padding floating-label, ça reste cohérent et sans nouveau CSS.

### Fichier modifié
- `src/pages/FichaRLT.tsx` — ligne ~1680 : ajouter `"static-field"` dans le `cn(...)` du `div` qui entoure chaque input numérique.

## Non modifié
- `.form-input` global (les autres formulaires continuent de fonctionner).
- Aucun changement de logique métier ni de schéma.
- Le PDF vierge et les autres sections restent inchangés.

## Vérification
Recharger `/admin/ficha/...`, scroller à la section 7, confirmer que le chiffre "0" (ou la valeur saisie) est centré verticalement dans la case, comme avant.
