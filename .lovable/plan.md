# Inclure ou non les écoles sans réponses

L'usager décide si les institutions sans réponses (0 encuesta) apparaissent dans les rapports.

## Ce qui change

Une nouvelle case à cocher dans le bloc de filtres, à côté du sélecteur de fase :

**« Incluir instituciones sin respuestas »** — décochée par défaut (comportement actuel du PDF).

Effet quand elle est cochée :

- **Vue « Por institución » (en ligne)** : les écoles à 0 réponse restent listées, en grisé avec la mention « Sin respuestas », sans graphiques.
- **PDF por institución** : un PDF est aussi généré pour ces écoles, avec l'en-tête habituel et un message « Sin respuestas registradas » à la place des résultats.
- **Compteur du bouton** : le total de PDF inclut ces écoles (ex. 25 au lieu de 18).

Effet quand elle est décochée : comme aujourd'hui — seules les écoles avec au moins une réponse sont exportées ; en ligne elles restent visibles mais ne produisent pas de PDF.

Le consolidé n'est pas affecté (il agrège les réponses existantes), mais son en-tête continue d'indiquer « X / Y instituciones con respuestas ».

## Technique

Fichier : `src/components/admin/AdminAmbienteStatsTab.tsx`

- Nouvel état `includeSinRespuestas` (défaut `false`).
- `pdfPlan` : quand l'option est active, ne plus filtrer sur `hasData` — inclure `{ ie, fase }` pour toutes les institutions de `targetIEs` et chaque fase demandée.
- `handleGeneratePDF` : pour une entrée sans données, générer un PDF « vide » via le générateur existant (`ambienteInstitucionPdfGenerator`) avec un tableau de réponses vide ; ajouter un garde-fou dans le générateur pour afficher « Sin respuestas registradas » si aucune donnée.
- `ieRows` : ajouter un champ `vacia` pour le rendu grisé dans l'accordéon.
- Récapitulatif sous les cases mis à jour pour refléter le nouveau total.
