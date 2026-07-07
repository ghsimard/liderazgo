## Objectif

Créer, à côté du bouton *Demo PDF*, un nouveau bouton qui génère un **Informe consolidé par Cohorte** utilisant le même gabarit PDF que le Demo (`generarAmbienteEscolarReportPDF`), mais alimenté par les **réponses réelles** de toutes les institutions de la cohorte sélectionnée.

## Où

Onglet Admin → Ambiente Escolar → **Estadísticas** (`src/components/admin/AdminAmbienteStatsTab.tsx`).

## Fonctionnement

1. Ajout d'un **sélecteur « Cohorte »** dans la barre de filtres (à côté de Región / ET / IE), alimenté par la table `ae_cohortes` (year ≥ 2026) déjà chargée dans le composant.
2. Ajout d'un bouton **« Informe consolidado por Cohorte »** dans la carte *Informes PDF*, désactivé tant qu'aucune cohorte n'est sélectionnée.
3. Au clic :
   - Filtrer les submissions réelles (`encuestas_ambiente_escolar`) par `cohorte_id` de la cohorte choisie.
   - Compter le nombre distinct d'IE (`institucion_educativa`) qui ont au moins une réponse dans cette cohorte.
   - Construire un `AmbienteReportData` unique agrégeant **toutes** les réponses docentes + estudiantes + acudientes de la cohorte.
   - En-tête PDF :
     - `institucion` = `"Cohorte {year} ({N instituciones})"` — ex. « Cohorte 2026 (23 instituciones) »
     - `entidadTerritorial` = vide (rapport transversal)
   - Logos : par défaut RLT + CLT visibles (rapport transversal, pas rattaché à une región).
4. Toast de succès / erreur identiques aux autres exports.

## En-tête du PDF

Comme demandé : `Cohorte {year} ({N} instituciones)` remplace le nom d'IE dans le titre du rapport. Le reste du gabarit (fréquences Likert, graphiques empilés, sections docentes/estudiantes/acudientes) reste **strictement identique** au Demo PDF.

## Bouton Demo PDF

Conservé tel quel pour l'instant (utile pour tests visuels). Peut être retiré séparément plus tard si souhaité.

## Détails techniques

- **Fichier modifié** : `src/components/admin/AdminAmbienteStatsTab.tsx` uniquement.
- Nouveaux états : `selCohorte: string`, `cohortes: {id, year}[]`.
- Nouvelle fonction : `handleCohorteConsolidatedPDF()` — pattern calqué sur `handleDemoPDF` mais utilisant les vraies submissions filtrées par `cohorte_id`.
- Aucun changement au générateur PDF (`ambienteEscolarReportPdfGenerator.ts`) — les champs `institucion` / `entidadTerritorial` acceptent déjà du texte libre.
- Aucun changement backend, aucune requête nouvelle (tout est déjà chargé dans `submissions` + `ae_cohortes`).

## Actions requises sur Render

- 🖥️ **Site statique (Frontend)** : redéploiement automatique du frontend après merge de la modification de `AdminAmbienteStatsTab.tsx`.
- ⚙️ **Web Service (Backend Express)** : aucune action.
- 🗄️ **Base de données (Manual SQL)** : aucune action.

## Hors périmètre

- Suppression / restriction du bouton Demo PDF.
- Consolidation par Región / ET / filtre global (non demandé).
- Modification du gabarit visuel du PDF.
