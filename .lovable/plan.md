

## Plan: Charger les Entidades Territoriales depuis les tables géographiques

### Problème
Le dropdown **Entidad Territorial** dans `AdminInformeModuloForm.tsx` (lignes 65-77) charge ses options depuis `fichas_rlt`. Si aucun directivo n'existe pour la région sélectionnée dans cette table, le dropdown reste vide — même si des données `informe_modulo` existent pour cette région/ET.

### Solution
Remplacer la requête `fichas_rlt` du useEffect (lignes 65-77) par une requête sur les tables géographiques : `regiones` → `region_entidades` → `entidades_territoriales`.

### Fichier modifié
`src/components/admin/AdminInformeModuloForm.tsx`

### Détail technique
Dans le `useEffect` déclenché par `selectedRegion` (ligne 65) :
1. Chercher l'ID de la région dans `regiones` via `nombre = selectedRegion`
2. Lire `region_entidades` filtrée par `region_id`
3. Lire `entidades_territoriales` avec les IDs obtenus
4. Peupler le dropdown ET avec ces noms
5. Si une seule ET → la pré-sélectionner automatiquement

### Impact
- Frontend uniquement
- Aucune migration
- 🖥️ Redéployer le site statique sur Render

