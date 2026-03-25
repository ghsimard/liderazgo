

# Hub de Documentación /specs

## Resumen

Crear une section `/specs` dans l'application qui centralise toute la documentation du projet : PRD complet, spécifications techniques, diagrammes Mermaid et wireframes sketchy générés à partir des écrans réels.

## Structure des pages

```text
/specs              → Hub principal (index avec navigation)
/specs/prd          → PRD complet (PRD.md rendu en Markdown)
/specs/specs        → Spécifications (SPECIFICATIONS.md existant)
/specs/diagramas    → Galerie de diagrammes Mermaid
/specs/wireframes   → Écrans sketchy (captures avec filtre CSS hand-drawn)
```

## Livrables

### 1. Fichiers statiques dans `public/specs/`

- Copier `PRD.md` vers `public/specs/PRD.md`
- Les diagrammes `.mmd` existants (flux d'authentification, flux simplifié) seront intégrés directement dans le code comme constantes ou chargés depuis `public/specs/diagrams/`
- Les 3 fichiers Mermaid générés précédemment y seront placés

### 2. Page hub `/specs` (SpecsHub.tsx)

- Carte de navigation avec 4 sections (PRD, Spécifications, Diagrammes, Wireframes)
- Design cohérent avec le reste de l'app (shadcn/ui cards)
- Avis de propriété intellectuelle (comme sur `/especificaciones`)

### 3. Page PRD `/specs/prd` (SpecsPrd.tsx)

- Charge `public/specs/PRD.md` et le rend avec ReactMarkdown + remarkGfm
- Support des diagrammes Mermaid intégrés dans le PRD (via le composant MermaidDiagram existant)
- Boutons imprimer et télécharger PDF (réutilisation du pattern existant)

### 4. Page Spécifications `/specs/specs`

- Redirection ou intégration de la page Especificaciones existante dans le nouveau hub

### 5. Page Diagrammes `/specs/diagramas` (SpecsDiagramas.tsx)

- Galerie de tous les diagrammes Mermaid du projet :
  - Flux d'authentification (technique)
  - Flux d'authentification (simplifié)
  - Diagrammes intégrés dans SPECIFICATIONS.md (flux directivo, evaluador, operador, admin)
- Chaque diagramme rendu avec le composant MermaidDiagram existant
- Titre et description pour chaque diagramme

### 6. Page Wireframes `/specs/wireframes` (SpecsWireframes.tsx)

- Captures d'écran des pages principales de l'app avec un filtre CSS "sketchy/hand-drawn" appliqué
- Utilisation d'iframes pointant vers les pages réelles de l'app avec un filtre CSS `grayscale` + `contrast` + police manuscrite overlay
- Alternative plus simple : screenshots statiques prises des écrans principaux, affichées avec un filtre CSS `filter: grayscale(1) contrast(0.8) sepia(0.1)` et bordure style cahier
- Pages à capturer : Accueil, Ficha RLT, Mi Panel, Panel Admin, Encuesta 360, Rubrica

### 7. Routes dans App.tsx

Ajouter les routes imbriquées sous `/specs/*` avec lazy loading.

## Détails techniques

- **Composants réutilisés** : MermaidDiagram, ReactMarkdown avec remarkGfm, Button, Card
- **Pattern existant suivi** : la page Especificaciones.tsx sert de modèle pour le rendu Markdown
- **Fichiers créés** :
  - `public/specs/PRD.md` (copie)
  - `public/specs/diagrams/*.mmd` (3 fichiers)
  - `src/pages/specs/SpecsHub.tsx`
  - `src/pages/specs/SpecsPrd.tsx`
  - `src/pages/specs/SpecsDiagramas.tsx`
  - `src/pages/specs/SpecsWireframes.tsx`
- **Fichiers modifiés** :
  - `src/App.tsx` (ajout des routes /specs/*)

