## Diagnostic
Le problème vient très probablement du flux de sauvegarde de l’écran `Informe de Módulo` côté Evaluador.

### Cause racine identifiée
1. Dans `src/pages/InformeModulo.tsx`, la sauvegarde fait d’abord :
   - `DELETE` sur `informe_modulo_equipo`
   - puis `INSERT` des lignes actuelles de l’équipe
2. En production, les Evaluadores n’ont pas de JWT admin ; ils n’ont qu’une cédula en session (`sessionStorage`).
3. Dans `server/routes/db.ts`, les requêtes `DELETE` passent par la branche protégée et exigent un token admin.
4. Le `DELETE` échoue donc pour un Evaluador, mais le code frontend ne stoppe pas la suite ni n’affiche l’erreur.
5. Les nouvelles lignes sont ensuite réinsérées quand même, ce qui accumule les doublons à chaque sauvegarde.

C’est cohérent avec la capture : le même membre d’équipe apparaît plusieurs fois à l’ouverture, parce que la table contient déjà des doublons persistés.

### Problème secondaire observé
La page Evaluador charge l’informe avec un filtre `region + module_number`, alors que la version admin filtre `region + entidad_territorial + module_number`.
Cela peut faire remonter le mauvais rapport si une région possède plusieurs entités territoriales.

## Plan de correction

### 1. Sécuriser le remplacement de l’équipe côté backend
Créer un flux backend dédié pour la sauvegarde Evaluador d’`Informe de Módulo` au lieu de dépendre du routeur générique `/api/db` pour un `DELETE` non autorisé.

Ce flux devra :
- valider que la cédula fournie correspond bien à un Evaluador existant
- vérifier qu’il a bien des affectations sur la région / entité concernée
- ouvrir une transaction
- créer ou mettre à jour `informe_modulo`
- remplacer proprement les lignes de `informe_modulo_equipo`
- créer / mettre à jour `informe_directivo`
- retourner un succès ou une erreur exploitable

Je n’ouvrirai pas les `DELETE` publics sur le routeur générique, car ce serait une régression de sécurité.

### 2. Corriger le frontend Evaluador pour utiliser ce flux dédié
Dans `src/pages/InformeModulo.tsx` :
- remplacer la logique de sauvegarde actuelle par un appel unique au backend dédié
- faire remonter les erreurs au toast si la suppression / insertion échoue
- ne plus continuer silencieusement quand une étape serveur échoue

### 3. Corriger la granularité Région / Entité Territoriale
Toujours dans `src/pages/InformeModulo.tsx` :
- regrouper les affectations par `region + entidad_territorial` au lieu de `region` seule
- charger le rapport avec `region + entidad_territorial + module_number`
- garder un affichage cohérent entre l’écran Evaluador et l’écran admin

### 4. Empêcher les doublons historiques de continuer à s’afficher
Lors du chargement de l’équipe :
- dédupliquer défensivement les lignes identiques déjà présentes en base pour l’affichage
- cela évitera un écran “pollué” le temps que les données soient nettoyées

### 5. Nettoyer les données déjà dupliquées
Prévoir une action correctrice sur les données existantes :
- repérer les doublons de `informe_modulo_equipo` par `informe_id + nombre + rol`
- conserver une occurrence et supprimer les répétitions strictement identiques

Comme nous sommes en mode plan, je préparerai cette correction comme une migration / opération de nettoyage sûre au moment de l’implémentation.

## Détails techniques
- Fichier frontend principal : `src/pages/InformeModulo.tsx`
- Fichier backend principal : `server/routes/db.ts` ou, de préférence, un nouveau routeur dédié au module
- Table concernée : `informe_modulo_equipo`
- Tables liées : `informe_modulo`, `informe_directivo`, `rubrica_evaluadores`, `rubrica_asignaciones`, `fichas_rlt`

## Validation après correctif
Je vérifierai :
1. qu’un Evaluador peut ouvrir un rapport existant sans voir de répétitions supplémentaires
2. qu’une sauvegarde remplace bien l’équipe au lieu d’ajouter des copies
3. qu’une seconde sauvegarde identique ne crée aucun doublon
4. que le rapport chargé correspond bien à la bonne entité territoriale
5. que les erreurs backend remontent clairement si quelque chose échoue

## Résultat attendu
Après correction, un Evaluador verra une seule occurrence par membre d’équipe, et les sauvegardes successives n’empileront plus les mêmes lignes.