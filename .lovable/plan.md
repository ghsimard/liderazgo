

## Plan: Outil de création de graphiques par question

### Probleme actuel
Les sections "Grafico + Analisis" sont liees a un **bloc entier** du formulaire (`chartSectionTitle`). L'admin ne peut pas choisir **quelles questions specifiques** inclure dans un graphique, ni combiner des questions de blocs differents.

### Solution
Ajouter un **selecteur de questions** dans les sections `chart_analysis`, permettant de choisir une ou plusieurs questions du formulaire. Les donnees du graphique seront calculees dynamiquement a partir des reponses en DB pour les questions selectionnees.

### Modifications

**1. `src/components/admin/AdminSatisfaccionReportTab.tsx`**

- Etendre l'interface `ReportSection` avec un champ optionnel `selectedQuestionKeys: string[]` pour stocker les cles de questions selectionnees (en plus du `chartSectionTitle` existant qui reste comme fallback)
- Ajouter un composant `QuestionPicker` dans le `SectionEditor` pour les sections `chart_analysis` :
  - Liste toutes les questions chartables (radio, likert4, checkbox-max3, grid-sino, grid-frequency, grid-logistic) du formulaire actif
  - Checkboxes pour selectionner/deselectionner des questions
  - Groupees par section du formulaire pour la lisibilite
- Modifier le calcul de `chartData` : si `selectedQuestionKeys` est defini, filtrer les stats pour ne garder que les questions selectionnees au lieu de matcher par `chartSectionTitle`
- Mettre a jour la preview du graphique pour refleter la selection

**2. Logique de calcul des stats (dans le meme fichier)**

- Enrichir chaque entree de `stats.sections` avec un champ `questionKey` pour pouvoir les identifier individuellement
- Permettre le filtrage par `questionKey[]` dans le `ChartPreview`

### Compatibilite
- Les rapports existants avec `chartSectionTitle` continuent de fonctionner (fallback)
- Les nouveaux rapports peuvent utiliser `selectedQuestionKeys` pour un controle fin
- La sauvegarde en DB reste dans le meme champ JSONB `content`

