

## Plan: Intégrer tout le contenu des specs dans le PRD Completo

Transformer la page PRD Completo (`SpecsPrd.tsx`) en une page composite qui affiche le markdown du PRD ET les sections interactives (diagrammes, hubs, wireframes, formulaires) positionnées aux bons endroits.

### Approche

Le PRD.md reste un fichier markdown statique. On ne peut pas y mettre les formulaires (données TypeScript) ni les wireframes (galeries d'images). La solution est de **scinder le rendu du PRD.md** en blocs et d'**injecter des composants React** entre les sections.

### Positionnement du contenu

| Contenu à injecter | Position dans le PRD | Source |
|---|---|---|
| **Diagrammes Mermaid** (6 diagrammes) | Après Section 10 "Flujos de Usuario" | Ajoutés directement dans `PRD.md` comme blocs `mermaid` |
| **Hubs de la Aplicación** (16 hubs) | Nouvelle Section 10.5 ou Appendice D | Composant React importé depuis `SpecsHubs` data |
| **Wireframes** (56 écrans) | Nouvel Appendice E | Composant React avec galerie d'images sketchy |
| **Especificaciones Técnicas** | Nouvel Appendice F — lien vers `/specs/specs` | Lien ou contenu inline |
| **Formularios** | Nouvel Appendice G | Composant React importé depuis `SpecsFormularios` data |

### Modifications

**Fichier 1 — `public/specs/PRD.md`**
- Ajouter les 6 diagrammes Mermaid dans la Section 10 (remplacer les blocs texte existants par des blocs ```mermaid)
- Ajouter des marqueurs `<!-- INJECT:hubs -->`, `<!-- INJECT:wireframes -->`, `<!-- INJECT:formularios -->` aux positions appropriées (après les appendices existants)

**Fichier 2 — `src/pages/specs/SpecsPrd.tsx`**
- Transformer le rendu : au lieu de rendre tout le markdown d'un coup, le découper aux marqueurs `<!-- INJECT:xxx -->`
- Pour chaque marqueur, injecter le composant React correspondant :
  - `INJECT:hubs` → Accordion avec les 16 hubs (features table + mindmap Mermaid) — réutiliser les données de `SpecsHubs.tsx`
  - `INJECT:wireframes` → Galerie d'images groupées par section avec filtre sketchy — réutiliser les données de `SpecsWireframes.tsx`
  - `INJECT:formularios` → Accordion avec Encuesta 360°, Ambiente Escolar, Satisfacción, Rúbricas — réutiliser les données de `SpecsFormularios.tsx`
- Extraire les données (arrays `hubs`, `sections`, etc.) dans des fichiers de données partagés ou les importer directement

**Fichier 3 — Données partagées** (optionnel)
- Extraire `hubs[]` de SpecsHubs dans un fichier data séparé pour réutilisation
- Extraire `sections[]` de SpecsWireframes dans un fichier data séparé

### Détails techniques

- Le markdown est découpé par `md.split(/<!-- INJECT:(\w+) -->/)` pour obtenir des paires [texte, clé]
- Chaque segment markdown est rendu avec `<ReactMarkdown>` comme aujourd'hui
- Entre les segments, les composants React sont insérés
- Les wireframes utilisent le même filtre CSS sketchy (`grayscale(1) contrast(0.85) sepia(0.08)`)
- Les hubs affichent : titre, type, routes, rôle, features (table), mindmap (MermaidDiagram)
- Les formularios reprennent exactement la structure existante de SpecsFormularios (Accordion + Tabs + Tables)
- Le bouton Imprimer reste fonctionnel (tout est dans le même flux DOM)

