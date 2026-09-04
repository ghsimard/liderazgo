# Propagation complète du nouveau nom d'école + historique des changements

Objectif : lorsqu'un administrateur renomme une école, le nouveau nom apparaît partout (écrans, rapports, PDF), et chaque renommage est conservé dans un historique consultable et réversible.

## Ce qui existe déjà

- Le renommage propage le nom dans 12 tables (fichas, 360, rubriques, ambiente escolar, tables 2025, permissions d'opérateurs) avec aperçu des compteurs et avertissement en cas de doublon.
- Un enregistrement réversible est déposé dans la corbeille (`deleted_records`, type « Renombrar institución ») avec annulation possible.
- Les rapports et PDF lisent les données en direct : ils affichent donc déjà le nouveau nom une fois la propagation faite.

## Ce qui sera ajouté

### 1. Historique dédié des renommages
- Nouvelle table d'historique : ancien nom, nouveau nom, date, auteur (cédula/nom), nombre de lignes touchées par table, statut (appliqué / annulé).
- Chaque renommage y écrit une ligne, en plus de l'entrée corbeille.

### 2. Nouvel onglet « Historial de cambios de nombre »
- Dans Fichas de Información / Configuración : liste triée par date, avec ancien nom → nouveau nom, auteur, date (UTC-5 Bogota), total de lignes modifiées et détail par table.
- Recherche par nom, filtre par période.
- Bouton « Revertir » qui refait la propagation en sens inverse et marque la ligne comme annulée (l'historique conserve les deux événements).
- Export PDF de l'historique (même style que les autres rapports).

### 3. Fiabilisation de la propagation
- Vérification après écriture : si une table renvoie une erreur, le renommage s'arrête et affiche précisément quelle table a échoué, sans laisser un état à moitié appliqué silencieux.
- Rafraîchissement des écrans ouverts (listes, monitores, rapports) après un renommage, pour éviter d'afficher l'ancien nom tant qu'on n'a pas rechargé.
- Contrôle avant validation : si le nouveau nom existe déjà, l'action est présentée explicitement comme une fusion d'écoles.

### 4. PDF
- Les PDF sont générés au moment du clic à partir des données : aucun PDF stocké à corriger. Les PDF déjà téléchargés par les utilisateurs gardent l'ancien nom (rien à faire côté application, il suffit de les régénérer).

## Détails techniques

- `src/utils/renameInstitucion.ts` : ajout de l'écriture dans la table d'historique, retour d'erreur bloquant, et fonction `revertRename`.
- Nouveau composant `src/components/admin/AdminInstitucionRenameHistory.tsx` monté dans `AdminGeographyTab.tsx`.
- Génération PDF de l'historique via jsPDF (côté navigateur, aucun stockage serveur).
- Aucune écriture directe Supabase : tout passe par `@/utils/dbClient`.

## Actions de déploiement

- 🗄️ Base de données (SQL manuel) : créer la table `institucion_renames` (id, old_name, new_name, changed_by_cedula, changed_by_nombre, counts jsonb, status, created_at) + index sur `created_at`.
- ⚙️ Web Service (Backend Express) : ajouter `institucion_renames` à la liste des tables autorisées dans `server/routes/db.ts` (lecture/écriture admin).
- 🖥️ Site statique (Frontend) : republier après les modifications ci-dessus.

Ordre : base de données → backend → frontend.
