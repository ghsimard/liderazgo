# Informes Ambiente Escolar — ZIP de PDF séparés

## Ce qui change

Le bloc « Informes PDF » garde ses deux cases (**PDF por institución** / **PDF consolidado**) et produit toujours un **ZIP de PDF séparés**, jamais de fusion.

Exemple : 30 écoles sélectionnées par les filtres + consolidé coché → ZIP contenant **31 PDF** (30 écoles + 1 consolidé).

### Corrections apportées

1. **Toujours un ZIP** — le raccourci actuel qui télécharge un PDF nu quand il n'y a qu'un seul document est supprimé. Le résultat est prévisible : un ZIP dans tous les cas.
2. **Structure du ZIP** — les fichiers restent rangés par fase :
   ```text
   Consolidado/Informe_Consolidado_<Fase>_<Ámbito>.pdf
   Inicial/Informe_Ambiente_Inicial_<Escuela>.pdf
   Evolucion/Informe_Ambiente_Evolucion_<Escuela>.pdf
   ```
   Si une seule fase est sélectionnée, il n'y a qu'un dossier de fase (les 30 PDF d'école + le consolidé).
3. **Compteur exact** — le bouton indique le total réel, ex. « Generar informes (31 PDF) », et le récapitulatif sous les cases détaille « 30 por institución + 1 consolidado ».

## Portée

Seules les institutions ayant des réponses pour la fase demandée génèrent un PDF (comportement actuel). Avec la fase « Ambas », une école ayant des données dans les deux fases produit 2 PDF (un par dossier).

## Détails techniques

Fichier concerné : `src/components/admin/AdminAmbienteStatsTab.tsx`. Aucune nouvelle dépendance.

- `handleGeneratePDF` : suppression de la branche `jobs.length === 1` (téléchargement direct) ; tous les jobs passent par la boucle JSZip existante.
- `buildJobs()`, `buildReportData`, `buildConsolidatedData`, les drapeaux de logos par région et la barre de progression restent inchangés.
- Ajout d'une ligne de récapitulatif sous les cases à cocher indiquant la répartition des PDF.
- Aucun changement d'API ni de base de données.

## Actions requises après approbation

- 🖥️ **Site statique (Frontend)** : republier (changement 100 % côté client).
- ⚙️ **Web Service (Backend Express)** : rien à faire.
- 🗄️ **Base de données** : rien à faire.
