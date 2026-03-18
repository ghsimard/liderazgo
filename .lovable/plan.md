

## Plan : Toggles de visibilité Encuesta 360 Entrada/Salida

### Contexte

Actuellement les boutons "Mis Encuestas 360° - Entrada" et "Mis Encuestas 360° - Salida" dans `MiPanel` sont toujours visibles pour les directivos. Il faut permettre aux Admin/Superadmin et aux Evaluadores de contrôler cette visibilité, comme c'est déjà fait pour `rubrica_visible`.

### 1. Migration base de données

Ajouter deux colonnes booléennes à `rubrica_asignaciones` :

```sql
ALTER TABLE rubrica_asignaciones 
  ADD COLUMN IF NOT EXISTS encuesta_entrada_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS encuesta_salida_visible boolean NOT NULL DEFAULT false;

-- Activer par défaut pour les asignations existantes
UPDATE rubrica_asignaciones SET encuesta_entrada_visible = true, encuesta_salida_visible = true;
```

Sur **Render**, exécuter ce SQL manuellement. La table `rubrica_asignaciones` est déjà dans `PUBLIC_UPDATE_TABLES`, donc pas de changement backend.

### 2. AdminEvaluadoresTab.tsx — Panel Admin

- Ajouter `encuesta_entrada_visible` et `encuesta_salida_visible` à l'interface `Asignacion`.
- Dans chaque ligne de directivo, ajouter 2 icônes de toggle supplémentaires (avec libellés courts "E" et "S" pour Entrada/Salida) à côté de l'Eye existant pour la rúbrica.
- Ajouter des boutons bulk "Activar/Desactivar todos" pour Entrada et Salida dans l'entête de chaque évaluateur (ou un dropdown/menu pour garder l'UI propre).
- Réutiliser le pattern existant de `handleToggleVisibility` et `handleBulkVisibility`.

### 3. MiPanel.tsx — Directivo

- Au chargement, récupérer `encuesta_entrada_visible` et `encuesta_salida_visible` depuis `rubrica_asignaciones` (même requête que `rubrica_visible`).
- Conditionner l'affichage du bouton "Mis Encuestas 360° - Entrada" à `encuesta_entrada_visible === true`.
- Conditionner l'affichage du bouton "Mis Encuestas 360° - Salida" à `encuesta_salida_visible === true`.

### 4. RubricaEvaluacion (evaluateur) — toggle par l'évaluateur

- Dans l'interface d'évaluation où l'évaluateur voit ses directivos assignés, ajouter les mêmes toggles Eye/EyeOff pour Entrada et Salida (en plus de celui qui existe déjà pour la rúbrica).

### Déploiement Render

- **Base de données** : Exécuter le SQL ci-dessus.
- **Site statique** : Redéployer.
- **Web Service** : Pas de changement (la table est déjà whitelistée pour UPDATE).

