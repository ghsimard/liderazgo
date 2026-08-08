# Informes Ambiente Escolar — choix du contenu PDF

Dans le bloc « Informes PDF », l'usager choisit explicitement ce qu'il veut télécharger : le PDF de chaque institution, le PDF consolidé, ou les deux.

## Ce qui change

Un seul bloc d'export avec deux cases à cocher :

- **PDF por institución** — un informe par institution retenue par les filtres (et par fase selon le sélecteur de fase).
- **PDF consolidado** — un seul informe agrégeant toutes les réponses de la sélection filtrée courante (cohorte(s), región, ET, instituciones, fase).

Les deux peuvent être cochées en même temps. Un bouton unique **Generar informes** applique le choix :

```text
por institución seul  -> 1 PDF si une seule institution/fase, sinon ZIP (Inicial/ + Evolucion/)
consolidado seul      -> 1 PDF consolidé
les deux              -> ZIP: Consolidado/ + Inicial/ + Evolucion/
aucune case cochée    -> bouton désactivé
```

Le libellé du bouton indique le total exact de PDF à générer (ex. « Generar informes (13 PDF) »).

## Détails

- Le consolidé s'appuie désormais sur les filtres actifs (au lieu du sélecteur « cohorte » isolé) ; son en-tête reprend la portée : nom(s) de cohorte ou « Selección filtrada », avec le nombre d'institutions incluses.
- Le sélecteur de cohorte actuel reste uniquement pour l'aperçu « Ver en línea » du consolidé.
- Les boutons PDF individuels déjà présents dans l'accordéon « Por institución » restent inchangés.
- « Demo PDF » reste inchangé.
- La barre de progression et les toasts existants sont réutilisés.

## Technique

Fichier concerné : `src/components/admin/AdminAmbienteStatsTab.tsx`.

- Nouveaux états `wantPorIE` / `wantConsolidado` (par défaut : por institución coché).
- Nouvelle fonction `buildConsolidatedData()` construite à partir de `baseFiltered` + `fasesRequested`, réutilisant `generarAmbienteEscolarReportPDF`.
- `handleGeneratePDF` réécrit pour composer la liste des documents à produire et décider PDF direct vs ZIP `JSZip`.
