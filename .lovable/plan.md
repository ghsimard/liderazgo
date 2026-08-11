# Monitoreo Ambiente Escolar — colonne « Total » et tri par colonne

## Ce qui change

Dans **Ambiente Escolar → Monitoreo**, le tableau des institutions :

### 1. Nouvelle colonne « Total »
- Placée immédiatement à droite de **Acudientes** (avant la colonne **Contacto**).
- Valeur = Docentes + Estudiantes + Acudientes pour l'institution, selon les filtres actifs (cohorte, fase, estado, búsqueda).
- Affichée en gras, sans code couleur (les seuils 0 / 1-24 / 25+ restent sur les trois colonnes de rôle).

### 2. Tri par colonne
- Les en-têtes **Institución**, **Docentes**, **Estudiantes**, **Acudientes** et **Total** deviennent cliquables.
- Un clic trie de façon croissante, un deuxième clic de façon décroissante ; une petite flèche indique la colonne et le sens actifs.
- Tri par défaut : **Institución** en ordre alphabétique (comportement actuel conservé).
- Le tri s'applique après les filtres et n'affecte pas les totaux affichés au-dessus du tableau.

## Détails techniques

- Modification limitée à `src/components/admin/AdminAmbienteMonitorTab.tsx`.
- Ajout d'un état `sortKey` / `sortDir` et d'un `useMemo` de tri appliqué à `filteredRows` ; `total` est calculé par ligne (dérivé, aucun changement de requête).
- Colonnes numériques triées en numérique, `Institución` avec `localeCompare(..., "es")`.
- L'export PDF conserve l'ordre affiché à l'écran et inclut la colonne Total.
- Aucun changement d'API ni de base de données.

## Actions requises après approbation

- 🖥️ **Site statique (Frontend)** : republier l'application.
- ⚙️ **Web Service (Backend Express)** : rien à faire.
- 🗄️ **Base de données** : rien à faire.
