## Objectif

1. Refonte visuelle complète du PDF cohorte (`Informe Δ Ambiente Escolar`).
2. Nouveau PDF par institución (synthèse Δ + distribution Likert par ítem).
3. Deux déclencheurs: bouton « PDF » sur chaque ligne du tableau « Δ por institución » + bouton global « Descargar PDFs por institución (ZIP) ».

## Périmètre

- Frontend uniquement (jsPDF + jszip déjà présent). Pas de changement DB ni backend.
- Réutilisation de `pdfLogoHelper` (cover/header/footer) et des données déjà chargées dans `AdminAmbienteDeltaTab`.

## 1. Refonte du PDF cohorte (`ambienteDeltaPdfGenerator.ts`)

Charte visuelle:
- Palette: primaire `#1E3A8A` (bleu profond), accent `#0EA5E9`, vert `#16A34A`, rouge `#DC2626`, gris `#64748B`, fond clair `#F8FAFC`.
- Typo: Helvetica (jsPDF natif) — titres bold + tracking, corps regular, italique pour métadonnées.

Structure refondue:
1. **Cover** — Bandeau couleur pleine largeur en haut (60mm) avec titre blanc « Informe Comparativo Δ » + sous-titre « Ambiente Escolar — Inicial vs Evolución ». Logos centrés sous le bandeau. Bloc d'identification (cohorte, dates Inicial/Evolución, fecha generación) dans une carte arrondie. Footer cover sans pagination.
2. **Résumé exécutif** (nouvelle page) — 3 KPI cards horizontales (Inicial, Evolución, Δ global) avec gros chiffres et badge coloré. Sous-cartes par grupo (Docentes/Estudiantes/Acudientes) avec mini-jauge horizontale (barre Inicial grise + barre Evolución colorée).
3. **Tabla de contenido** (intégrée au résumé si tient sur 1 page).
4. **Sistema de calificación** — Encadré stylisé, paragraphes courts, légende colorée ▲ ▼ =.
5. **Detalle por grupo** — Pour chaque grupo: en-tête coloré pleine largeur (bandeau 10mm), sous-bandeau avec compteurs respuestas + Δ global du grupo en badge à droite, tableau zébré (lignes alternées `#F8FAFC`) avec colonnes Sección / Inicial / Evolución / Δ pt / Δ %; cellule Δ avec pastille colorée (▲ vert / ▼ rouge / = gris).
6. **Δ por institución** (nouvelle page) — Tableau zébré listant chaque institución comparable: nom, n Ini, n Evo, Inicial, Evolución, Δ, badge coloré.
7. **Análisis automatizado** — Mise en forme paragraphes justifiés, drop cap optionnel sur première lettre, indentation propre.

Détails techniques:
- Helpers ajoutés: `drawColoredHeaderBar(doc, y, color, title, subtitle?)`, `drawKpiCard(doc, x, y, w, h, label, value, deltaBadge?)`, `drawDeltaBadge(doc, x, y, delta)`, `drawZebraRow(doc, ...)`.
- Tous les `setTextColor`/`setFillColor` extraits dans un objet `PALETTE` en haut de fichier.
- `ensureSpace` conservé; ajout d'un helper `addContentPage(title)` qui dessine header logos + titre de section coloré.
- Type `AmbienteDeltaReportData` étendu avec `institucionDeltas: { institucion: string; countIni: number; countEvo: number; ini: number|null; evo: number|null; delta: number|null }[]`.

## 2. Nouveau PDF par institución (`ambienteInstitucionPdfGenerator.ts`)

Nouveau fichier qui réutilise la même charte/helpers (extraits dans `pdfLogoHelper` ou `ambienteDeltaPdfStyles.ts` partagé).

Structure:
1. **Cover** — Même bandeau coloré. Titre « Informe Δ por Institución ». Bloc identification: cohorte, **nombre institución**, dates Ini/Evo, n respuestas par grupo (Ini → Evo).
2. **Síntesis Δ** — 3 KPI cards (Inicial / Evolución / Δ) pour l'institución. Tableau récapitulatif par grupo.
3. **Detalle por grupo y sección** — Même mise en forme que le PDF cohorte mais restreint à l'institución (avg par sección Ini/Evo/Δ).
4. **Distribución Likert por ítem** — Pour chaque grupo présent: pour chaque ítem Likert, un mini-bloc:
   - Énoncé de l'ítem (texte court, wrap).
   - Deux barres horizontales empilées segmentées (Nunca → Siempre) avec couleurs graduées; ligne « Inicial » au-dessus, « Evolución » en-dessous.
   - À droite, n total Ini/Evo + Δ moyenne en badge.
   - Légende des couleurs Likert affichée une fois par grupo.

Détails techniques:
- Nouveau fichier `src/utils/ambienteInstitucionPdfGenerator.ts` exportant `generarPDFAmbienteInstitucion(data, logos)`.
- Calcul de la distribution Likert: nouvelle fonction `countLikertDistribution(subs, itemId): Record<option, number>` ajoutée dans le composant (ou util séparé `ambienteDeltaStats.ts`) et appelée pour bâtir le payload PDF.
- Récupération des libellés d'ítems: `ACUDIENTES_LIKERT / ESTUDIANTES_LIKERT / DOCENTES_LIKERT` exposent déjà `{ id, label }` par ítem; passer la liste complète au PDF.

## 3. Intégration UI (`AdminAmbienteDeltaTab.tsx`)

- Dans le tableau « Δ por institución »: ajouter une colonne « Acciones » avec bouton `PDF` (icône `FileDown`) par ligne → appelle `handleDownloadInstitucionPdf(institucion)`.
- Au-dessus du tableau (ou à côté du bouton « Descargar informe PDF »), ajouter `Descargar PDFs por institución (ZIP)` qui:
  - Génère chaque PDF en mémoire (`doc.output("blob")`), les ajoute à un `JSZip`, télécharge `Informe_Delta_PorInstitucion_<cohorte>.zip`.
  - État `zipping` avec spinner + progression (« 3/12 »).
- Construire `institucionDeltas` enrichi avec sections par grupo (réutilise le calcul existant `institucionDeltas` + étend avec `sectionsPorGrupo` et `distribucionLikert`).
- Passer `institucionDeltas` au PDF cohorte refondu pour alimenter la section « Δ por institución ».

## Fichiers touchés

- ✏️ `src/utils/ambienteDeltaPdfGenerator.ts` — refonte complète.
- ➕ `src/utils/ambienteInstitucionPdfGenerator.ts` — nouveau.
- ➕ `src/utils/ambienteDeltaPdfStyles.ts` — palette + helpers partagés (KPI card, header bar, badge Δ, zebra row, Likert bar).
- ✏️ `src/components/admin/AdminAmbienteDeltaTab.tsx` — calcul distribution Likert + sections par instituci ón, 2 nouveaux boutons, état zipping.

## Déploiement

- 🖥️ **Site statique (Frontend)**: tous les changements ci-dessus. Redeploy nécessaire.
- ⚙️ **Web Service**: aucun changement.
- 🗄️ **Base de données**: aucun changement.

## Vérifications

- Générer le PDF cohorte pour Itagüí 2025 → contrôler couverture, KPI, tableaux zébrés, section Δ por institución, análisis.
- Générer 1 PDF institución (ex: Los Gómez) → vérifier distribution Likert lisible et alignée.
- Générer le ZIP → vérifier nombre de fichiers = nombre d'institutions comparables, nommage `Informe_Delta_<institucion>.pdf`.
