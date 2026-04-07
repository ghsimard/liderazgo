
### Diagnostic

Oui: le problème ne vient pas de la permission admin, mais de la source utilisée pour remplir le dropdown.

Pour l’opérateur `88888888`, la permission lue est bien `Quibdó`.  
Mais dans `AdminAsistenciaTab.tsx`, la liste des régions est construite depuis `fichas_rlt` :

- `loadDirectivos()` lit les directivos dans `fichas_rlt`
- puis fabrique `allRegiones` à partir des régions réellement présentes dans ces fiches
- or, dans les données actuelles, `fichas_rlt` ne retourne que `Oriente`
- donc `Quibdó` n’existe pas dans les options du `Select`

Résultat:
- `selectedRegion` vaut bien `Quibdó`
- mais comme aucun `<SelectItem value="Quibdó" />` n’est rendu, le composant affiche un champ vide
- en ouvrant le dropdown, on ne voit pas `Quibdó`, seulement les options issues des données existantes

Ce n’est donc pas un problème d’accent ni de permission: c’est un problème de peuplement du dropdown.

### Plan de correction

1. **Corriger `AdminAsistenciaTab.tsx`**
   - ne plus dépendre uniquement de `fichas_rlt` pour alimenter la liste des régions
   - si `allowedRegions` existe, utiliser cette liste comme source d’options du dropdown
   - conserver le filtrage des directivos par région pour le tableau
   - si la région autorisée n’a encore aucun directivo, afficher quand même `Quibdó` dans le dropdown, avec tableau vide / 0 résultat

2. **Appliquer le même correctif aux autres sous-onglets du module**
   - `AdminInformeModuloForm.tsx`
   - `AdminEvalIndividualTab.tsx`
   
   Ces composants construisent aussi leurs régions depuis `fichas_rlt`, donc ils peuvent produire le même bug pour une région permise sans données.

3. **Ne pas toucher `AdminInformeReportTab.tsx`**
   - lui charge déjà les régions depuis la table `regiones`
   - il est donc sur la bonne approche

### Résultat attendu

Pour un opérateur ayant uniquement la permission `Quibdó` :

- le dropdown Région affiche directement `Quibdó`
- aucune autre région comme `Oriente` n’apparaît
- s’il n’existe aucun directivo dans `Quibdó`, l’écran montre simplement **aucune donnée** au lieu d’un dropdown vide

### Détails techniques

Pattern à appliquer dans les composants concernés :

- calculer une liste `effectiveRegions`
  - `allowedRegions` si elle existe
  - sinon les régions issues des données
- rendre le `Select` depuis `effectiveRegions`
- pré-sélectionner automatiquement la région unique si `effectiveRegions.length === 1`

### Impact

- uniquement frontend
- aucune migration base de données
- aucune mise à jour Render spécifique autre que redéployer le code corrigé
