

## Plan: Dashboard administratif

### Objectif
Créer un onglet "Dashboard" qui s'affiche par défaut lors du login admin, présentant des statistiques agrégées de tous les modules avec des filtres en cascade.

### Sources de données
Les statistiques seront extraites de ces tables :
- **fichas_rlt** : Nombre de fichas, par cargo, par région
- **encuestas_360** : Comptages par fase (entrada/salida), tipo_formulario, institution
- **rubrica_seguimientos** : Nombre d'évaluations de rúbrica, par module, par niveau
- **encuestas_ambiente_escolar** : Comptages par tipo_formulario, institution
- **satisfaccion_responses** : Comptages par form_type, module, région
- **informe_modulo** : Nombre d'informes par module, région
- **informe_asistencia** : Taux de présence par module
- **encuesta_invitaciones** : Invitations envoyées vs répondues
- **rubrica_submission_dates** : Soumissions de rúbrica par module

### Filtres
Barre de filtres en cascade en haut du dashboard :
- **Región** → **Entidad Territorial** → **Municipio** → **Institución** (via `useGeographicData`)
- **Módulo** (1-N, basé sur rubrica_modules)
- Bouton "Limpiar filtros"

### Sections du dashboard (cards KPI + mini-graphiques)

1. **Fichas de Información** : Total fichas, % complétées, répartition par cargo (Rector/a, Coordinador/a)
2. **Encuesta 360°** : Total soumissions Entrada vs Salida, progression par tipo_formulario (barres), directivos completos vs incompletos
3. **Rúbricas** : Soumissions par module, distribution des niveaux (avanzado/intermedio/básico/sin evidencia)
4. **Ambiente Escolar** : Réponses par tipo (acudientes/estudiantes/docentes), par institution
5. **Satisfacción** : Réponses par form_type et module
6. **Informe de Módulo** : Informes soumis par module/région
7. **Asistencia** : Taux de présence AM/PM par module

Chaque section sera une `Card` avec un titre, un chiffre principal et un mini-graphique (Recharts `BarChart` ou `PieChart`).

### Changements techniques

**1. Nouveau composant : `src/components/admin/AdminDashboardTab.tsx`**
- Composant principal contenant les filtres et les cards KPI
- Utilise `useGeographicData` pour les filtres en cascade
- Requêtes Supabase avec `.eq()` conditionnels selon les filtres actifs
- Recharts pour les visualisations (déjà dans le projet)

**2. Modifier `src/components/admin/AdminSidebar.tsx`**
- Ajouter un item "Dashboard" avec icône `LayoutDashboard` en première position (avant "Enlaces")

**3. Modifier `src/pages/AdminPage.tsx`**
- Importer `AdminDashboardTab` (lazy)
- Ajouter le case "dashboard" dans `AdminContent` et `getHubTitle`
- Changer le tab par défaut de `"formularios"` à `"dashboard"`

**4. Modifier `src/pages/AdminLogin.tsx`**
- S'assurer que la redirection post-login pointe vers `/admin` (tab dashboard par défaut)

### UI
- Grille responsive : 2 colonnes sur desktop, 1 sur mobile
- Cards avec icône colorée, chiffre principal en grand, sous-titre descriptif
- Mini-graphiques intégrés dans certaines cards
- Palette cohérente avec le reste de l'admin (primary, muted, etc.)

