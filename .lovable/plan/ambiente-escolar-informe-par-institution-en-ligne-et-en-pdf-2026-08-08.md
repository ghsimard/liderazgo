# Ambiente Escolar — informe par institution, en ligne et en PDF

## Situation actuelle

Dans **Ambiente Escolar → Informes → Estadísticas** :
- Le rapport **en ligne** fusionne toutes les institutions sélectionnées en un seul bloc (Inicial / Evolución), on ne voit donc pas les résultats école par école.
- Le rapport **consolidé par cohorte** n'existe qu'en PDF.
- Les PDF par institution existent déjà (un PDF si une seule institution/fase, sinon un ZIP), mais sans aperçu en ligne préalable.

## Ce qu'on ajoute

### 1. Sélecteur de vue du rapport en ligne
Un bouton à deux positions au-dessus du rapport :
- **Consolidado** — la vue actuelle (toutes les institutions fusionnées).
- **Por institución** — nouvelle vue, activée par défaut dès qu'il y a plus d'une institution.

### 2. Vue « Por institución » (en ligne)
- Une section pliable (accordéon) par institution, triée par ordre alphabétique.
- En-tête de chaque section : nom de l'institution, entidad territorial, nombre de réponses par fase (Inicial / Evolución).
- À l'ouverture : les mêmes graphiques et tableaux que le rapport actuel (Docentes / Estudiantes / Acudientes), séparés par fase selon le filtre « Fase ».
- Bouton **Descargar PDF** dans l'en-tête de chaque institution : génère immédiatement le PDF de cette école uniquement (même générateur que l'export actuel, donc mise en page identique).
- Les institutions sans aucune réponse dans le filtre courant sont affichées en grisé avec « Sin respuestas ».

### 3. Rapport consolidé par cohorte en ligne
Sous le sélecteur de cohorte existant, ajout d'un bouton **Ver en línea** qui affiche le consolidé de la cohorte (mêmes graphiques et tableaux) directement dans la page, en plus du bouton PDF déjà présent.

## Détails techniques

- Modifications limitées à `src/components/admin/AdminAmbienteStatsTab.tsx` : le bloc de rendu existant (`renderReportBlock`) est réutilisé tel quel pour chaque institution, aucune duplication de la logique de calcul (`computeFrequencies`).
- Le PDF par institution réutilise `buildReportData` + `generarAmbienteEscolarReportPDF` et les drapeaux de logos par région déjà en place — aucun nouveau générateur PDF.
- Rendu différé : le contenu d'une institution n'est calculé qu'à l'ouverture de son accordéon, pour éviter de ralentir la page quand plusieurs dizaines d'écoles sont affichées.
- Aucun changement d'API ni de base de données.

## Actions requises après approbation

- 🖥️ **Site statique (Frontend)** : republier l'application (changement 100 % côté client).
- ⚙️ **Web Service (Backend Express)** : rien à faire.
- 🗄️ **Base de données** : rien à faire.
