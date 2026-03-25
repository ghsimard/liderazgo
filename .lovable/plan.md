

# Spécifications par Hub — Page dédiée `/specs/hubs`

## Constat

Le PRD (`PRD.md`) et les spécifications (`SPECIFICATIONS.md`) sont déjà complets avec les détails de chaque hub, leurs mindmaps et leurs sous-onglets. Cependant, tout est dans un seul long document. L'utilisateur souhaite une vue navigable par hub.

## Plan

### 1. Nouvelle page `/specs/hubs` (SpecsHubs.tsx)

Page avec un accordion ou des cartes cliquables, une section par hub de l'application (pas seulement admin). Chaque hub affiche :
- Titre et description
- Tableau des sous-onglets/fonctionnalités  
- Mindmap Mermaid rendu visuellement
- Routes associées

**Hubs couverts (13 sections) :**

| # | Hub | Type |
|---|-----|------|
| 1 | Pantalla de Inicio | Page publique |
| 2 | Ficha RLT | Page publique |
| 3 | Mi Panel (Directivo) | Page publique |
| 4 | Mi Panel (Evaluador) | Page publique |
| 5 | Hub Encuesta 360° | Page publique |
| 6 | Panel Operador | Page publique |
| 7 | Panel Admin — Enlaces | Hub admin |
| 8 | Panel Admin — Fichas | Hub admin |
| 9 | Panel Admin — Rúbricas | Hub admin |
| 10 | Panel Admin — Encuesta 360° | Hub admin |
| 11 | Panel Admin — Informe de Módulo | Hub admin |
| 12 | Panel Admin — Ambiente Escolar | Hub admin |
| 13 | Panel Admin — Satisfacciones | Hub admin |
| 14 | Panel Admin — MEL | Hub admin |
| 15 | Panel Admin — Sistema | Hub admin |
| 16 | Contacto / FAQ / Sugerencias | Pages publiques |

Chaque section inclura :
- **Ruta(s)** : chemins d'accès
- **Rol requerido** : qui peut y accéder
- **Funcionalidades** : tableau des fonctionnalités avec description
- **Mindmap** : diagramme Mermaid (réutilisant ceux de SPECIFICATIONS.md + en ajoutant pour les pages publiques manquantes)

### 2. Ajout de mindmaps pour les pages publiques manquantes

Les mindmaps suivants n'existent pas encore dans SPECIFICATIONS.md et seront créés :
- **Pantalla de Inicio** : flux d'identification par cédula
- **Mi Panel (Directivo)** : ficha, rúbricas, encuestas 360, satisfacción
- **Mi Panel (Evaluador)** : rúbricas, informe de módulo, encuestas 360
- **Panel Operador** : sections segmentées par permissions

### 3. Ajout de la carte dans le SpecsHub

Ajouter une 5e carte "Hubs de la Aplicación" dans `/specs` pointant vers `/specs/hubs`.

### 4. Route dans App.tsx

Ajouter `<Route path="/specs/hubs" element={<SpecsHubs />} />` avec lazy loading.

## Fichiers

| Action | Fichier |
|--------|---------|
| Créer | `src/pages/specs/SpecsHubs.tsx` |
| Modifier | `src/pages/specs/SpecsHub.tsx` (ajouter carte) |
| Modifier | `src/App.tsx` (ajouter route) |

## Détails techniques

- Composant avec accordion (`shadcn/ui Accordion`) pour chaque hub
- Chaque section contient un tableau HTML et un `MermaidDiagram`
- Les données sont définies comme constantes dans le fichier (pas de fetch externe)
- Toutes les informations sont extraites du code source existant (AdminPage.tsx, MiPanel.tsx, OperadorPanel.tsx, etc.)

