

## Plan : Ajouter le toggle `rubrica_visible` pour Admin/Superadmin

### Contexte

L'admin dispose déjà de l'onglet **Rúbricas > Configuración** où il gère les asignaciones (évaluateur ↔ directivos). Il faut y ajouter la possibilité de toggler `rubrica_visible` pour chaque directivo assigné.

### Changement unique

**Fichier** : `src/components/admin/AdminRubricasTab.tsx` (onglet Configuración)

Dans la liste des directivos assignés à un évaluateur, ajouter :

- Un bouton `Eye`/`EyeOff` à côté de chaque directivo (même pattern que dans `RubricaEvaluacion.tsx`).
- Des boutons "Activar todos" / "Desactivar todos" en haut de la liste des assignés de chaque évaluateur.
- Chaque clic fait un `UPDATE rubrica_asignaciones SET rubrica_visible = !current WHERE id = X`.

Il faudra :
1. Charger `rubrica_visible` dans le `select` des asignaciones existant.
2. Ajouter l'icône toggle dans le rendu de chaque ligne de directivo assigné.
3. Mettre à jour le state local après chaque toggle.

### Déploiement

- **Site statique** : Oui
- **Web Service** : Non
- **Base de données** : Non (la colonne et les policies existent déjà)

