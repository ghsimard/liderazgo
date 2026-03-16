

## Plan : Validation 10 chiffres pour les champs téléphone

### Contexte

3 champs téléphone dans `FichaRLT.tsx` :
- `celular_personal` (obligatoire, actuellement `min(7)`)
- `telefono_emergencia` (optionnel)
- `telefono_ie` (optionnel)

### Modifications dans `src/pages/FichaRLT.tsx`

1. **Créer une fonction utilitaire `stripPhone`** qui retire tout sauf les chiffres : `value.replace(/\D/g, "")`

2. **Mettre à jour la validation Zod** :
   - `celular_personal` : transformer avec `.transform(stripPhone)` puis `.pipe(z.string().length(10, "Debe tener exactamente 10 dígitos"))`
   - `telefono_emergencia` et `telefono_ie` : optionnels, mais si remplis, doivent aussi avoir exactement 10 chiffres après nettoyage — utiliser `.refine()` pour valider conditionnellement

3. **Nettoyer avant sauvegarde** (lignes ~683, ~691, ~715) : appliquer `stripPhone()` aux 3 champs dans l'objet envoyé à la base de données, pour ne stocker que les 10 chiffres purs

4. **Autoriser la saisie** : le composant `PhoneInputWithCountry` continue d'accepter espaces et tirets dans l'input — seule la validation et la sauvegarde nettoient

### Ce qui ne change pas
- Le composant `PhoneInputWithCountry` lui-même
- Les country codes
- Les autres champs du formulaire

