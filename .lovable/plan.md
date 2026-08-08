# Informes Ambiente Escolar — export batch : ZIP ou PDF unique fusionné

## Ce qui change

Dans le bloc « Informes PDF », les deux cases actuelles restent (**PDF por institución** / **PDF consolidado**). On ajoute un choix de **format de sortie** :

- **Archivo ZIP** — comportement actuel : un PDF par école (+ le consolidé si coché), rangés dans `Consolidado/`, `Inicial/`, `Evolucion/`. Nouveauté : le ZIP est produit même s'il n'y a qu'un seul document, pour un résultat prévisible.
- **PDF único** — un seul fichier PDF contenant, dans l'ordre : le consolidé (si coché), puis chaque institution l'une après l'autre. Exemple : 30 écoles = 1 PDF avec les 30 rapports enchaînés.

Le libellé du bouton reste explicite : « Generar informes (30 PDF) » en mode ZIP, « Generar informe único (30 secciones) » en mode PDF unique.

## Portée

Seules les institutions ayant des réponses pour la fase demandée sont incluses (comportement actuel, inchangé). Les écoles sans réponses restent visibles en grisé dans la vue en ligne mais ne produisent pas de rapport.

## Détails techniques

Fichier concerné : `src/components/admin/AdminAmbienteStatsTab.tsx` (+ ajout de la dépendance `pdf-lib`).

- Nouvel état `outputFormat: "zip" | "single"` (défaut `zip`), rendu en groupe de boutons radio à côté des cases existantes.
- `buildJobs()` est réutilisé tel quel : même liste de documents, mêmes données, mêmes drapeaux de logos.
- Mode ZIP : logique actuelle, sans le raccourci « un seul job = téléchargement direct ».
- Mode PDF unique : chaque job est généré en blob via `generarAmbienteEscolarReportPDF(..., { returnBlob: true })`, puis les pages sont concaténées avec `PDFDocument.copyPages` de `pdf-lib` dans un document final téléchargé sous `Informe_Ambiente_Escolar_<fecha>.pdf`.
- La barre de progression et les toasts existants sont réutilisés pour les deux modes.
- Aucun changement de générateur PDF, d'API ni de base de données.

## Actions requises après approbation

- 🖥️ **Site statique (Frontend)** : republier (ajout de la dépendance `pdf-lib`, donc rebuild nécessaire).
- ⚙️ **Web Service (Backend Express)** : rien à faire.
- 🗄️ **Base de données** : rien à faire.
