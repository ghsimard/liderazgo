

## Plan : Réouvrir le modal des noms quand l'utilisateur modifie son nom

### Approche

Ajouter un événement `onFocus` sur les champs `nombres` et `apellidos` (lignes 1103-1119) qui rouvre le modal avec les valeurs actuelles pré-remplies.

### Modifications dans `src/pages/FichaRLT.tsx`

1. **Champs `nombres` et `apellidos`** : ajouter `onFocus` qui appelle une fonction `handleNameFieldFocus`
2. **Nouvelle fonction `handleNameFieldFocus`** : pré-remplit `modalNombres`/`modalApellidos` avec les valeurs actuelles du formulaire (`getValues`) puis ouvre `setShowNameModal(true)`
3. Le modal existant fonctionne tel quel — au clic "Confirmar" il écrase les valeurs du formulaire et se ferme

Cela garantit que chaque fois que l'utilisateur clique sur un champ nom, il revoit l'avertissement sur les majuscules/accents avant de modifier.

