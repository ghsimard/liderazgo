

## Plan: Ajouter `rubrica_asignaciones` aux tables autorisées en INSERT public

### Problème
Sur production, l'assignation de directivos à un évaluateur échoue avec "Authentification requise". La table `rubrica_asignaciones` est dans `PUBLIC_UPDATE_TABLES` (PATCH autorisé) mais **pas** dans `PUBLIC_INSERT_TABLES`. Donc le POST (insert) exige une vérification JWT admin, qui échoue probablement car le token n'est pas reconnu ou a expiré.

### Solution
Ajouter `rubrica_asignaciones` à `PUBLIC_INSERT_TABLES` dans `server/routes/db.ts` (ligne ~57-74). Cela est cohérent puisque la table est déjà autorisée en mise à jour publique.

### Fichier modifié
`server/routes/db.ts`

### Détail technique
Ajouter `"rubrica_asignaciones"` dans le `Set` `PUBLIC_INSERT_TABLES` (après `"informe_asistencia"` ligne 72).

### Impact
- Backend uniquement
- Aucune migration
- Redéployer le **Web Service** sur Render

