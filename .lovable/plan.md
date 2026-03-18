

## Plan : Contrôle de visibilité Encuesta 360 Entrada/Salida par Région

### Problème actuel
Les toggles Entrada/Salida sont gérés au niveau de chaque directivo dans `rubrica_asignaciones` (AdminEvaluadoresTab + RubricaEvaluacion). L'utilisateur veut un contrôle centralisé sous le menu **Encuesta 360°**, avec la possibilité d'activer/désactiver par **région**, **institution** ou **directivo**.

### Approche

Créer une table de configuration dédiée `encuesta_360_visibility` (similaire à `satisfaccion_config`) et un nouveau sous-onglet "Visibilidad" dans le hub Encuesta 360°.

### 1. Migration base de données

Créer une nouvelle table :

```sql
CREATE TABLE encuesta_360_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fase text NOT NULL CHECK (fase IN ('inicial', 'final')),
  scope_type text NOT NULL CHECK (scope_type IN ('region', 'institucion', 'directivo')),
  scope_value text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fase, scope_type, scope_value)
);

ALTER TABLE encuesta_360_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read encuesta_360_visibility" ON encuesta_360_visibility FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert encuesta_360_visibility" ON encuesta_360_visibility FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update encuesta_360_visibility" ON encuesta_360_visibility FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete encuesta_360_visibility" ON encuesta_360_visibility FOR DELETE TO public USING (has_admin_access(auth.uid()));
```

- `fase`: `'inicial'` (Entrada) ou `'final'` (Salida)
- `scope_type`: `'region'`, `'institucion'`, ou `'directivo'`
- `scope_value`: nom de la région, nom de l'institution, ou cédula du directivo

### 2. Nouveau composant : AdminEncuesta360VisibilityTab

Sous-onglet **"Visibilidad"** dans le hub Encuesta 360° (`AdminPage.tsx`).

**Interface** :
- Deux sections : **Entrada** et **Salida**
- Pour chaque section, un tableau avec les régions, et des switches on/off
- Bouton pour ajouter un contrôle au niveau institution ou directivo (override plus granulaire)
- Logique de cascade : si la région est désactivée, toutes les institutions/directivos de cette région sont cachés, sauf si un override spécifique les active

**Fonctionnalité** :
- Charger les régions depuis `regiones`
- Afficher un Switch par région × phase
- Permettre d'ajouter des overrides par institution (sélecteur) ou par directivo (sélecteur cédula)
- Upsert dans `encuesta_360_visibility`

### 3. Modifications AdminPage.tsx

Ajouter le sous-onglet "Visibilidad" dans le TabsList du hub Encuesta 360° :
```
<TabsTrigger value="visibilidad">Visibilidad</TabsTrigger>
```

### 4. Modifications MiPanel.tsx

Remplacer la logique actuelle (lecture de `rubrica_asignaciones.encuesta_entrada_visible`) par :
1. Récupérer la région et l'institution du directivo via `get_ficha_by_cedula`
2. Vérifier `encuesta_360_visibility` pour déterminer si Entrada/Salida sont actifs, avec priorité : directivo > institution > region
3. Si aucune entrée n'existe, **masquer** par défaut (sécurité)

### 5. Modifications AdminEvaluadoresTab.tsx et RubricaEvaluacion.tsx

- **Retirer** les toggles "E" et "S" (Entrada/Salida) des deux fichiers
- Conserver uniquement le toggle "R" (Rúbrica) qui reste au niveau du directivo
- Retirer les boutons bulk correspondants

### 6. Nettoyage base de données (optionnel, migration séparée)

Supprimer les colonnes `encuesta_entrada_visible` et `encuesta_salida_visible` de `rubrica_asignaciones` (après validation que tout fonctionne).

### 7. Whitelisting Render

Ajouter `encuesta_360_visibility` dans `PUBLIC_UPDATE_TABLES` et `PUBLIC_INSERT_TABLES` dans `server/routes/db.ts`.

### Déploiement Render

- **🗄️ Base de données** : Exécuter le SQL de création de table manuellement
- **🖥️ Site statique** : Redéployer
- **⚙️ Web Service** : Redéployer (changement dans `db.ts`)

### Fichiers modifiés
- `server/routes/db.ts` — whitelist nouvelle table
- `src/pages/AdminPage.tsx` — ajouter sous-onglet Visibilidad
- `src/components/admin/AdminEncuesta360VisibilityTab.tsx` — **nouveau** composant
- `src/pages/MiPanel.tsx` — nouvelle logique de visibilité
- `src/components/admin/AdminEvaluadoresTab.tsx` — retirer toggles E/S
- `src/pages/RubricaEvaluacion.tsx` — retirer toggles E/S
- Migration SQL pour la nouvelle table

