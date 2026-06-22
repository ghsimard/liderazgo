## Objectif

Préciser le rapport Δ Ambiente Escolar (onglet "Delta") pour:
1. Calculer le **Δ global de la cohorte** uniquement sur les institutions qui ont au moins une réponse en phase **Evolución** (sinon une IE sans Evolución gonfle artificiellement la base Inicial).
2. Afficher une **liste détaillée par institution** montrant Inicial, Evolución et Δ — uniquement pour les IE ayant des valeurs dans les deux phases.

## Changements

### 1. Récupération des données (`AdminAmbienteDeltaTab.tsx`)
- Ajouter `institucion_educativa` au `SELECT` sur `encuestas_ambiente_escolar`.
- Conserver le chargement paginé existant.

### 2. Nouvelle logique de filtrage
- Calculer l'ensemble `iesAvecEvolucion` = institutions distinctes ayant ≥ 1 submission liée à la campagne `cierre` de la cohorte sélectionnée (tous groupes confondus).
- **Filtrer toutes les submissions** (Inicial et Evolución) pour ne garder que celles dont `institucion_educativa ∈ iesAvecEvolucion` avant les agrégats par groupe / section / cohorte.
- Le Δ global de la cohorte et les Δ par groupe sont donc recalculés sur cette base homogène.

### 3. Nouveau bloc UI "Δ por institución"
Nouvelle `Card` après le Δ global, avant les cartes par groupe :
- Tableau trié par Δ décroissant (▲ vert / ▼ rouge / = gris).
- Colonnes : Institución · Nº respuestas (Ini / Evo) · Inicial · Evolución · Δ.
- Calcul par IE : moyenne non pondérée des moyennes des 3 groupes (Docentes, Estudiantes, Acudientes), même méthode que le global cohorte, pour cohérence.
- Une IE n'apparaît que si elle a au moins une valeur dans chaque phase (sinon Δ non calculable).
- En-tête : compteur `X institución(es) con datos comparables sobre Y total de la cohorte`.

### 4. Indication contextuelle
- Sous le card "Δ Global de la cohorte", ajouter une note : *"Calculado únicamente sobre las N instituciones con respuestas en la fase Evolución."*
- Mettre à jour la légende du système de calificación pour mentionner cette règle.

### 5. PDF (`ambienteDeltaPdfGenerator.ts`)
- Ajouter dans `AmbienteDeltaReportData` :
  - `iesConEvolucionCount`, `iesTotalCohorteCount`
  - `institucionesDeltas: { institucion, countIni, countEvo, ini, evo, delta }[]`
- Page de couverture : afficher "Δ calculé sur N/Y instituciones (Evolución disponible)".
- Nouvelle page "Detalle por institución" avec le même tableau (trié Δ décroissant), pagination automatique via `ensureSpace`.
- L'export PDF passe les nouveaux champs depuis `handleDownloadPdf`.

### 6. Payload du análisis automatizado
- Ajouter dans le payload envoyé à `generate-section-text` un champ `institucionesConDelta` (top/bottom, comptages) pour que l'analyse pédagogique reflète la nouvelle base. Aucun changement côté serveur requis si le prompt accepte des champs additionnels — seulement enrichir le contexte.

## Hors scope
- Pas de filtre UI par institution (le tableau couvre déjà la lecture détaillée).
- Pas de modification des campagnes ni du schéma DB.
- Aucun changement aux autres onglets (Monitor, Stats, Campañas).

## Fichiers touchés
- `src/components/admin/AdminAmbienteDeltaTab.tsx` (logique + nouveau tableau)
- `src/utils/ambienteDeltaPdfGenerator.ts` (nouvelle section PDF + types)
