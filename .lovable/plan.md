# Édition par Module des formulaires Intensivo et Interludio

## Objectif

1. Ajouter un sélecteur de **Module (1-4)** dans l'onglet Admin → Satisfacciones → Formularios pour prévisualiser et éditer.
2. Permettre à l'admin de **modifier, ajouter ou supprimer des questions/sections** dans les formulaires *Intensivo* et *Interludio* **de manière indépendante pour chaque module (1, 2, 3, 4)**. Le formulaire *Asistencia* reste unique (ne dépend pas du module).
3. Documenter l'impact sur le **Rapport PDF** des Satisfacciones.

---

## 1. Sélecteur de Module (1-4)

Dans `AdminSatisfaccionFormsTab.tsx`, à côté du sélecteur de formulaire, on ajoute :

- Pour **Intensivo** et **Interludio** : onglets `Module 1 / 2 / 3 / 4`.
- Pour **Asistencia** : le sélecteur est masqué (formulaire unique, identique pour tous les modules).

Le sélecteur contrôle à la fois la Vue préliminaire et le mode Édition, et passe le `moduleNumber` réel au composant `SatisfaccionForm` (au lieu du `1` actuellement codé en dur).

---

## 2. Édition par module

### Modèle de données

Actuellement, la table `satisfaccion_form_definitions` stocke **une seule définition par `form_type`** (contrainte UNIQUE sur `form_type`).

Changements :

- Ajouter la colonne `module_number INTEGER NULL` (NULL = s'applique à tous les modules, utilisé par Asistencia et comme *fallback* lorsqu'un module n'a pas encore de surcouche).
- Remplacer la contrainte UNIQUE `(form_type)` par UNIQUE `(form_type, module_number)`.
- Logique de chargement (`loadFormDefinition`) :
  1. Chercher la définition spécifique `form_type = X AND module_number = N`.
  2. Si elle n'existe pas, chercher `form_type = X AND module_number IS NULL` (définition globale héritée de la version actuelle).
  3. Si elle n'existe pas, utiliser la définition `DEFAULT_FORMS` statique de `src/data/satisfaccionData.ts`.

### Comportement dans l'éditeur

- En changeant de module, la définition correspondante se recharge.
- Le bouton **Enregistrer** persiste la définition avec le `module_number` actif.
- Le bouton **Réinitialiser** supprime uniquement la ligne de ce module (revient au fallback global ou au défaut).
- Indicateur visuel :
  - « Personnalisé pour le Module N » s'il y a une ligne propre.
  - « Hérité (global) » s'il hérite de la définition sans `module_number`.
  - « Par défaut » s'il n'y a rien en base de données.
- Nouveau bouton **« Copier depuis un autre module »** (Module 1 → 2, etc.) pour accélérer la configuration.

### Application dans le formulaire public

`loadFormDefinition()` dans `src/data/satisfaccionData.ts` (et le composant `SatisfaccionPage`) reçoit désormais `(formType, moduleNumber)` et applique la même cascade Spécifique → Global → Défaut. Les pages `/satisfaccion-intensivo` et `/satisfaccion-interludio` connaissent déjà `moduleNumber` via la query string.

---

## 3. Impact sur le Rapport PDF des Satisfacciones

Le « Rapport PDF » (onglet Admin → Satisfacciones → Informes, généré par `AdminSatisfaccionReportTab.tsx` + `satisfaccionPdfGenerator.ts`) et la page de couverture partagée avec le « Rapport Régional » sont affectés comme suit :

### A. Étiquettes et regroupement des questions
Aujourd'hui, le rapport lit toujours `SATISFACCION_FORMS[formType]` (définition **statique**) pour :
- Afficher le texte de chaque question/section dans le PDF.
- Regrouper les réponses par section.
- Calculer les moyennes Likert, les comptages Sí/No/Parcial, les fréquences, etc.

Après le changement, il doit lire la définition **du module filtré** (même cascade Spécifique → Global → Défaut). Si l'admin filtre « Tous les modules », le rapport utilisera la définition globale/défaut pour les étiquettes.

### B. Questions qui n'existent plus / questions nouvelles
- **Questions supprimées** dans un module : n'apparaissent plus dans le PDF de ce module, mais les réponses historiques restent dans `satisfaccion_responses` (elles s'afficheront sous « Questions non reconnues » ou seront omises, selon ta préférence).
- **Questions nouvelles** : n'auront des réponses qu'à partir du moment où elles sont publiées ; le PDF affichera « Sans réponses » pour les périodes antérieures.

### C. Clés de question (`key`)
Si l'admin **renomme une `key`**, les réponses précédentes deviennent orphelines (ne seront pas regroupées avec les nouvelles). Il est recommandé de :
- Bloquer l'édition de `key` lorsqu'il y a déjà des réponses pour cette combinaison module+question, ou
- Afficher un avertissement dans l'éditeur.

### D. Commentaires narratifs et « Aspects saillants »
La table `satisfaccion_report_content` est déjà partitionnée par `(form_type, module_number, region)`, donc **elle ne nécessite aucune migration**. Les textes narratifs resteront liés au module correspondant.

### E. Logos et page de couverture
Aucun changement. La page de couverture du PDF (logos supplémentaires, région, module) continue de fonctionner comme aujourd'hui.

### F. Composants à mettre à jour
- `AdminSatisfaccionReportTab.tsx` (lignes 130, 257, 353, 1421) : remplacer `SATISFACCION_FORMS[formType]` par un chargement async/mémorisé qui respecte `module_number`.
- `satisfaccionPdfGenerator.ts` : recevoir le `formDef` déjà résolu au lieu de l'importer du statique.
- `loadFormDefinition()` dans `src/data/satisfaccionData.ts` : nouvelle signature `(formType, moduleNumber, supabaseClient)`.

---

## Actions par environnement (Render)

- 🖥️ **Site statique (Frontend)** :
  - Modifier `AdminSatisfaccionFormsTab.tsx` (sélecteur de module, enregistrer/charger par module, bouton « copier depuis »).
  - Modifier `AdminSatisfaccionReportTab.tsx` et `satisfaccionPdfGenerator.ts` pour utiliser la définition spécifique du module.
  - Mettre à jour `loadFormDefinition()` dans `src/data/satisfaccionData.ts` et les pages `SatisfaccionIntensivo` / `SatisfaccionInterludio`.

- ⚙️ **Web Service (Backend Express)** :
  - Aucun changement de code (la table est déjà exposée via le proxy `dbClient`). Vérifier uniquement que `satisfaccion_form_definitions` reste dans la whitelist (elle l'est déjà, lignes 59 et 145 de `server/routes/db.ts`).

- 🗄️ **Base de données (SQL manuel sur Render)** :
  ```sql
  ALTER TABLE public.satisfaccion_form_definitions
    ADD COLUMN IF NOT EXISTS module_number INTEGER;

  ALTER TABLE public.satisfaccion_form_definitions
    DROP CONSTRAINT IF EXISTS satisfaccion_form_definitions_form_type_key;

  CREATE UNIQUE INDEX IF NOT EXISTS satisfaccion_form_definitions_type_module_key
    ON public.satisfaccion_form_definitions (form_type, COALESCE(module_number, -1));
  ```
  Cette même migration doit être appliquée sur Supabase (Lovable Cloud) pour maintenir la parité.
