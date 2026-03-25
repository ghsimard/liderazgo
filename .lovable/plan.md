

## Plan: Ajouter une page "Formularios" dans les Specs

Créer une nouvelle page `/specs/formularios` accessible depuis le hub `/specs` qui affiche tous les formulaires et questions de chaque Hub, avec une section spéciale pour l'Encuesta 360° montrant dominios, competencias, items et ponderaciones.

### Structure de la page

La page sera organisée en sections dépliables (Accordion) :

1. **Hub Encuesta 360°** (section principale et la plus détaillée)
   - Sous-section **Estructura** : Tableau des 3 dominios → 13 competencias → 39 ítems (avec mapping item→competencia)
   - Sous-section **Ponderaciones** : Tableau des poids par compétence et rôle observateur (coor, doce, admi, acud, estu)
   - Sous-section **Formularios** : 6 onglets (Docente, Estudiante, Directivo, Acudiente, Administrativo, Autoevaluación) affichant les 39 questions de chaque formulaire, séparées en Frecuencia (1-18) et Acuerdo (19-39)
   - Sous-section **Escalas** : Les options de réponse (Frecuencia et Acuerdo)

2. **Hub Ambiente Escolar**
   - 3 formulaires (Acudientes, Estudiantes, Docentes) avec leurs sections Likert (Comunicación, Prácticas Pedagógicas, Convivencia)

3. **Hub Satisfacción**
   - 3 formulaires (Asistencia, Interludio, Intensivo) avec toutes les sections et questions

### Fichiers à modifier/créer

1. **Créer** `src/pages/specs/SpecsFormularios.tsx` — Page complète avec les données importées directement des fichiers source existants
2. **Modifier** `src/pages/specs/SpecsHub.tsx` — Ajouter la carte "Formularios" dans le hub
3. **Modifier** `src/App.tsx` — Ajouter la route `/specs/formularios`

### Détails techniques

- Importer les données directement depuis `src/data/encuesta360Data.ts`, `src/data/ambienteEscolarData.ts`, `src/data/satisfaccionData.ts` et `src/data/reporte360Phrases.ts`
- Utiliser les composants existants : `Accordion`, `Tabs`, `Table`
- Pour la section Encuesta 360° Estructura, construire un tableau hiérarchique à partir de `DOMAIN_ORDER`, `COMPETENCIES_BY_DOMAIN`, `COMPETENCY_LABELS`, `ITEM_COMPETENCY` et `REPORT_PHRASES`
- Pour les ponderaciones, afficher les `COMPETENCY_WEIGHTS` en tableau (compétence × rôle)
- Chaque formulaire liste ses questions avec numéro et texte, regroupées par type de réponse

