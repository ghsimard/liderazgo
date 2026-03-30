

## Plan: Sauvegarde en temps réel de l'Asistencia

### Problème actuel
L'onglet Asistencia nécessite de cliquer manuellement sur "Guardar" pour persister les changements. L'utilisateur veut que chaque modification (checkbox, raison, observations) soit sauvegardée immédiatement en base.

### Solution
Modifier `src/components/admin/AdminAsistenciaTab.tsx` pour effectuer un upsert automatique à chaque changement :

1. **Checkbox (toggleDay)** : Après la mise à jour locale du state, appeler immédiatement un upsert sur `informe_asistencia` pour la ligne concernée
2. **Raison d'inasistencia (Select)** : Idem, upsert immédiat au changement de valeur
3. **Observaciones (Input)** : Upsert au `onBlur` (perte de focus) pour éviter un appel à chaque frappe
4. **Suppression du bouton "Guardar"** et du state `dirty`/`saving` global — chaque changement se sauvegarde seul
5. **Feedback visuel** : Petit indicateur discret (toast léger ou icône de synchro) pour confirmer la sauvegarde sans être intrusif

### Détails techniques

- Créer une fonction `saveRow(row: AsistenciaRow)` qui fait un upsert individuel avec `onConflict: "directivo_cedula,module_number,dia"`
- `toggleDay` : appelle `saveRow` après `setAsistencia`
- `updateField` pour `razon_inasistencia` : appelle `saveRow` directement (le Select déclenche `onValueChange` une seule fois)
- `updateField` pour `observaciones` : le state reste local à chaque frappe, mais un `onBlur` sur l'Input déclenche `saveRow`
- Retirer le bouton "Guardar", les states `saving` et `dirty`
- En cas d'erreur de sauvegarde, afficher un toast destructif

### Fichier modifié
- `src/components/admin/AdminAsistenciaTab.tsx`

