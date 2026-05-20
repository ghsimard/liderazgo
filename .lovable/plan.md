# Édition des formulaires de Satisfaction par module (overrides)

## Objectif

Permettre à l'administrateur d'éditer, de manière indépendante, le formulaire de chaque Módulo (1-4) pour les trois `form_type` (Asistencia, Interludio, Intensivo). Les définitions actuelles sont conservées comme **base partagée** ; chaque module peut avoir un **override optionnel** qui la remplace.

## Comportement fonctionnel

- **Définition de base** (`module_number IS NULL`) : une par `form_type`. C'est ce qui existe aujourd'hui.
- **Override de module** (`module_number ∈ {1, 2, 3, 4}`) : optionnel, une par `(form_type, module_number)`. S'il existe, il remplace la base pour ce module.
- **Résolution dans le frontend public (`SatisfaccionPage.tsx`)** : au rendu du formulaire pour un directivo, chercher d'abord l'override pour `(form_type, module_number)`. S'il n'existe pas, utiliser la définition de base. S'il n'y a pas de base non plus, utiliser le `DEFAULT_FORMS` du code.
- **Admin → Satisfacciones → Formularios** :
  - Le sélecteur existant "Módulo 1/2/3/4" passe à contrôler aussi le **chargement et l'édition** (et non seulement la prévisualisation).
  - Indicateur visuel de l'état : badge **"Base partagée"** (module = base) ou **"Override Módulo N"** (module spécifique actif) ou **"Hérite de la base"** (module sans override).
  - Bouton **"Créer un override depuis la base"** quand il n'existe pas d'override pour le module sélectionné.
  - Bouton **"Supprimer l'override"** quand il existe, pour revenir à hériter de la base.
  - Bouton **"Éditer la base partagée"** (toggle vers `module_number = NULL`) pour éditer la définition commune.

## Modifications

### 1. 🗄️ Base de données (Migration Supabase + SQL Manuel Render)

```sql
-- 1. Ajouter la colonne module (nullable = base partagée)
ALTER TABLE public.satisfaccion_form_definitions
  ADD COLUMN module_number integer;

-- 2. Supprimer l'ancienne contrainte unique sur form_type
ALTER TABLE public.satisfaccion_form_definitions
  DROP CONSTRAINT IF EXISTS satisfaccion_form_definitions_form_type_key;

-- 3. Une seule base par form_type (quand module_number est NULL)
CREATE UNIQUE INDEX satisfaccion_form_definitions_base_unique
  ON public.satisfaccion_form_definitions (form_type)
  WHERE module_number IS NULL;

-- 4. Un seul override par (form_type, module_number)
CREATE UNIQUE INDEX satisfaccion_form_definitions_override_unique
  ON public.satisfaccion_form_definitions (form_type, module_number)
  WHERE module_number IS NOT NULL;

-- 5. Valider la plage du module
ALTER TABLE public.satisfaccion_form_definitions
  ADD CONSTRAINT satisfaccion_form_definitions_module_check
  CHECK (module_number IS NULL OR module_number BETWEEN 1 AND 4);
```

Les lignes existantes restent automatiquement avec `module_number = NULL` → elles deviennent des **définitions de base**. Aucune réponse déjà envoyée n'est affectée (la table `satisfaccion_responses` est indépendante).

### 2. 🖥️ Site statique (Frontend)

- **`AdminSatisfaccionFormsTab.tsx`** :
  - Faire en sorte que `previewModule` contrôle aussi le chargement (`loadFormDef(selectedType, previewModule)`).
  - Nouveau bouton toggle **"Base / Módulo N"** et sélecteur explicite de ce qu'on édite.
  - `loadFormDef` cherche d'abord `(form_type, module_number)`, s'il n'existe pas, tente `(form_type, NULL)` et affiche "Hérite de la base".
  - `handleSave` fait un upsert avec la colonne `module_number` appropriée.
  - Boutons **"Créer un override depuis la base"** (clone les champs et sauvegarde avec `module_number = N`) et **"Supprimer l'override"** (DELETE avec `module_number = N`).
- **`SatisfaccionPage.tsx`** (formulaire public pour le directivo) :
  - Charger la définition personnalisée avant le rendu : essayer l'override par module, sinon la base, sinon fallback sur le `DEFAULT_FORMS` déjà importé.
  - Passer le `formDef` résolu à `<SatisfaccionForm />` (aujourd'hui il utilise `SATISFACCION_FORMS[formType]` de manière statique).

### 3. ⚙️ Web Service (Backend Express)

Aucune action. La table `satisfaccion_form_definitions` est déjà dans `ALLOWED_TABLES` et le proxy PostgREST accepte la nouvelle colonne sans changement de code.

## Actions de déploiement Render

- 🗄️ **Base de données (SQL Manuel)** : exécuter le bloc SQL ci-dessus dans la base Render (les `CREATE UNIQUE INDEX` et `CHECK` après le `ALTER TABLE`).
- 🖥️ **Site statique (Frontend)** : redeploy de `AdminSatisfaccionFormsTab.tsx` et `SatisfaccionPage.tsx`.
- ⚙️ **Web Service (Backend Express)** : aucune action.

## Vérification post-déploiement

1. Admin → Satisfacciones → Formularios → sélectionner "Intensivo" + Módulo 2 → doit afficher "Hérite de la base".
2. Clic sur "Créer un override depuis la base", modifier une question, sauvegarder → le badge change à "Override Módulo 2".
3. Retour au Módulo 1 → doit continuer à afficher la base originale.
4. Ouvrir `/satisfaccion-intensivo?module=2` en tant que directivo → doit afficher la question modifiée.
5. Ouvrir `/satisfaccion-intensivo?module=1` → doit afficher la version originale.
6. Retourner à l'admin, clic "Supprimer l'override" sur Módulo 2 → revient à hériter de la base.
