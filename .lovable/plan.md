

## Plan: Bouton IA pour chaque zone de texte du rapport

### Objectif
Ajouter un bouton "Generar con IA" à côté de chaque zone de texte éditable dans le constructeur de rapport. Lorsqu'un graphique ou tableau est associé à la section, l'IA utilise ces données pour rédiger le texte d'analyse.

### Zones concernées
1. **Sections "Texto libre"** — génère un texte contextuel basé sur le titre de la section et les données générales du rapport
2. **Sections "Gráfico + Análisis"** — génère une analyse basée sur les données du graphique (indicateurs, pourcentages)
3. **Sections "Nivel General de Satisfacción"** — génère un texte introductif basé sur les % de satisfaction
4. **Sections "Lista de viñetas"** — génère automatiquement des viñetas basées sur les commentaires et statistiques
5. **Resumen ejecutivo** — déjà implémenté ✓

### Modifications

**1. Nouvelle Edge Function `generate-section-text`**
- Reçoit : `sectionType`, `sectionTitle`, `chartData` (si applicable), `generalStats`, `filterType/Module/Region`, `totalResponses`, `comments` (échantillon)
- Construit un prompt adapté selon le type de section :
  - `text` → rédige un paragraphe contextuel
  - `chart_analysis` → analyse les indicateurs du graphique (noms + %)
  - `satisfaction_summary` → commente les niveaux de satisfaction par bloc
  - `bullet_list` → génère 4-6 points structurés
- Utilise `google/gemini-3-flash-preview` via le gateway Lovable AI
- Gère les erreurs 429/402

**2. Modification de `SectionEditor`** (`AdminSatisfaccionReportTab.tsx`)
- Ajouter un état `generatingAI` local
- Ajouter une fonction `handleGenerateAI` qui appelle la nouvelle edge function avec le contexte approprié
- Pour chaque `RichTextEditor`, ajouter un bouton `<Sparkles>` "Generar con IA" au-dessus
- Pour `bullet_list`, ajouter un bouton "Generar viñetas con IA" à côté du bouton "Agregar viñeta"
- Le texte généré remplace le contenu existant (avec confirmation si non vide)

**3. Données envoyées selon le type**

| Type section | Données contextuelles envoyées |
|---|---|
| `text` | titre, filterType/Module/Region, totalResponses, overallSatisfaction |
| `chart_analysis` | titre + chartData (label/value pour chaque indicateur) |
| `satisfaction_summary` | generalSatisfaction array + overallSatisfaction |
| `bullet_list` | échantillon de commentaires + stats générales |

**4. Config TOML**
- Ajouter l'entrée pour la nouvelle fonction avec `verify_jwt = false`

### Rétro-compatibilité
Aucun impact sur les rapports existants. Le bouton IA est optionnel et le texte généré reste éditable.

