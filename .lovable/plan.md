## Objectif

Dans **Ambiente Escolar → Estadísticas**, permettre de consulter le rapport par institution **en ligne** (rendu web dans l'onglet) **et** en **PDF téléchargeable**, séparément pour **Inicial** (fase `linea_base`) et **Evolución** (fase `cierre`), avec sélection multi-cohorte et multi-institution (une, plusieurs ou toutes).

Aujourd'hui : les stats affichées en bas mélangent toutes les fases et un seul PDF par institution est possible sans distinction Inicial/Evolución.

## Portée

- **Frontend uniquement** : `src/components/admin/AdminAmbienteStatsTab.tsx`.
- Aucune modification backend, SQL, ni générateur PDF (`ambienteEscolarReportPdfGenerator.ts`) : on lui passe déjà `submissions[]` filtrées.

## Modifications

### 🖥️ Site statique — `AdminAmbienteStatsTab.tsx`

**1. Filtres (carte Filtros)** — ajouter/étendre :
- **Cohorte(s)** : nouveau `MultiSelect` sur `cohortes`. Placeholder « Todas las cohortes ». State `selCohortes: string[]`.
- **Institución(es)** : remplacer le `Select` actuel par un `MultiSelect`. State `selectedIEs: string[]` (vide = toutes du filtre courant).
- **Fase** : nouveau `Select` — « Inicial », « Evolución », « Ambas ». State `selFase: "inicial" | "evolucion" | "ambas"`, défaut `"ambas"`.
- Mapping : Inicial → `fase === "linea_base"`, Evolución → `fase === "cierre"`.
- Cascade : reset `selectedIEs` quand région / entidad / cohortes change ; `institutionOptions` filtre aussi par `selCohortes`.

**2. Rapport en ligne (visualisation)**
- Le bloc Tabs Docentes/Estudiantes/Acudientes en bas devient le **rapport en ligne**.
- Refléter tous les filtres actifs (`selCohortes`, `selectedIEs`, `selFase`) sur `filtered`.
- Ajouter un en-tête récapitulatif au-dessus des Tabs :
  - Titre : nom de l'IE si une seule sélectionnée, sinon « N instituciones » ; nom de la cohorte si une seule ; badge de fase (« Inicial », « Evolución », ou « Ambas » — si Ambas, afficher deux sous-sections empilées Inicial puis Evolución avec leur propre `FrequencyChart` + `FrequencyTable`).
  - Compteur de réponses par fase.
- Si `selFase === "ambas"` et qu'une seule IE est sélectionnée : rendre **deux blocs successifs** (Inicial puis Evolución) au lieu d'un seul mélangé, pour permettre la comparaison visuelle en ligne.
- Si aucune donnée pour la fase choisie → message « Sin datos para esta selección ».

**3. Export PDF**
- Un bouton principal « Generar Informe(s) » dont le libellé indique le total : `Generar (N PDF)` où N = `#institutions_sélectionnées × #fases_avec_données`.
- Pour chaque institution × chaque fase demandée :
  - filtrer `submissions` par IE + fase (skip si 0 réponses),
  - `AmbienteReportData.institucion = "<IE> — Inicial|Evolución"`,
  - générer PDF.
- 1 seul PDF → téléchargement direct.
- Plusieurs PDF → ZIP `Informes_Ambiente_<AAAA-MM-JJ>.zip` avec sous-dossiers `Inicial/` et `Evolucion/`, fichiers `Informe_Ambiente_<Fase>_<IE>.pdf`.
- Conserver « Demo PDF » et « Informe consolidado por Cohorte » tels quels.

### ⚙️ Web Service — aucune action

### 🗄️ Base de données — aucune action

## Note de données

`fase='cierre'` n'a actuellement aucune réponse en base ; le rapport en ligne Evolución affichera « Sin datos para esta selección » et l'export skip les PDF Evolución vides tant que les données ne sont pas enregistrées. Aucune action requise — dès que les réponses Evolución arriveront, tout s'active automatiquement.

## Vérification

1. Filtre Cohorte = Medellín 2025 + Fase = Inicial + 1 IE → rapport en ligne affiche 1 bloc Inicial ; bouton = « Generar (1 PDF) » → téléchargement direct.
2. Fase = Ambas + 1 IE avec seulement Inicial → rapport en ligne affiche bloc Inicial + « Sin datos » pour Evolución ; export = 1 PDF Inicial.
3. Fase = Ambas + 3 IE → ZIP avec sous-dossiers, 1 PDF par IE × fase disponible.
4. Toutes IE + toutes cohortes + Ambas → rapport en ligne agrégé, ZIP complet.
