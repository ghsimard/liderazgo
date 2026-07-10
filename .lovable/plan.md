## Contexte

Le tableau MEL joint définit l'indicateur intermédiaire d'ambiente escolar de façon très précise :

- Pour chaque institution et chaque **composante** (Comunicación, Prácticas pedagógicas, Convivencia) :
  - **ΔS = %S_post − %S_base** (proportion de "Siempre" + "Casi siempre")
  - **ΔN = %N_post − %N_base** (proportion de "Nunca" + "Casi nunca")
  - La composante **cumple** si `ΔS ≥ +5 pp` **OU** `ΔN ≤ −5 pp`.
- L'**institution cumple** l'indicateur si **≥ 2 des 3 composantes** cumplen.
- L'indicateur global = **% d'instituciones qui cumplen** / total d'instituciones avec données comparables (base ET post).
- **Meta : 80 %**. Ligne de base : 0 %.
- Exigence de comparabilité : variation d'échantillon ≤ 10 % entre base et post.

Aujourd'hui, l'onglet **Ambiente Escolar → Delta** calcule une **moyenne Likert 1-5** et affiche un `Δ moyen` par composante et par grupo. Ce n'est **pas** l'indicateur MEL : il ne dit pas si une institution *cumple*, ni combien d'instituciones cumplen, ni si la Meta 80 % est atteinte.

## Objectif

Ajouter dans l'onglet **Delta** une **vue "Indicador MEL"** qui applique exactement la formule du tableau, en gardant la vue actuelle (moyennes Likert) comme lecture complémentaire.

## Portée

- **🖥️ Site statique (Frontend)** — `src/components/admin/AdminAmbienteDeltaTab.tsx` + un nouvel utilitaire de calcul + adaptation du PDF Delta.
- **⚙️ Web Service (Backend Express)** — aucune action.
- **🗄️ Base de données (SQL manuel)** — aucune action.

## Modifications

### 🖥️ Site statique

**1. Nouveau util `src/utils/melAmbienteIndicator.ts`**

Fonctions pures, testables :

- `computePctSN(subs, itemIds)` → `{ pctS, pctN, n }` où
  - `pctS` = part des réponses ∈ {Siempre, Casi siempre} sur l'ensemble `subs × itemIds`,
  - `pctN` = part des réponses ∈ {Nunca, Casi nunca}.
- `componentCumple(base, post)` → `{ deltaS, deltaN, cumple: boolean }` avec règle `ΔS ≥ 5 || ΔN ≤ -5` (en points de pourcentage).
- `institucionCumple(componentsResults)` → `{ componentsCumplen, cumple: componentsCumplen >= 2 }`.
- `computeSampleComparability(nBase, nPost)` → variation en % ; flag `comparable` si ≤ 10 %.
- `computeMelIndicator(rows)` → agrégat cohort/global : `{ nInstituciones, nCumplen, pct, metaAlcanzada: pct >= 80 }`.

Les 3 composantes sont récupérées depuis `SECTIONS_BY_FORM` (déjà les 3 titres Comunicación / Prácticas Pedagógicas / Convivencia).

**Choix méthodologique** (à confirmer dans "Vérification" ci-dessous) :

- L'indicateur MEL est défini au niveau **institution**. Il faut décider quel jeu de réponses utiliser par composante :
  - **Option A (recommandée) :** union de tous les répondants (docentes + estudiantes + acudientes) pour chaque composante — le tableau ne distingue pas les grupos.
  - Option B : calculer un ΔS/ΔN par grupo × composante puis "cumple" si ≥ 2/3 composantes cumplen pour au moins un grupo.

**2. `AdminAmbienteDeltaTab.tsx` — ajout d'un bloc "Indicador MEL"** au-dessus des tableaux actuels

- Encadré résultat global :
  - `X / Y instituciones cumplen (Z %)` — Meta 80 % : ✓ Alcanzada / ✗ Falta …
  - `Z − 0 = Z pp` vs línea base.
  - Note de comparabilité muestral (nombre d'IE écartées si variation > 10 %).
- Tableau par institution (remplace/enrichit `institucionDeltas`) avec colonnes :
  - Institución • n base • n post • Var. muestral %
  - Comunicación : ΔS pp / ΔN pp / ✓ ou ✗
  - Prácticas Pedagógicas : ΔS pp / ΔN pp / ✓ ou ✗
  - Convivencia : ΔS pp / ΔN pp / ✓ ou ✗
  - **Cumple institución** (badge ✓ si ≥ 2/3)
- Conserver le tableau "moyenne Likert" existant en dessous, sous un titre clair « Lectura complementaria — promedios Likert 1-5 » pour éviter la confusion avec l'indicateur officiel.

**3. `ambienteDeltaPdfGenerator.ts`**

- Ajouter une nouvelle section PDF « Indicador MEL — Ambiente Escolar » avant la section actuelle, avec :
  - le résumé global (% de instituciones que cumplen, Meta 80 %),
  - le tableau institution × composante (mêmes colonnes que l'UI),
  - une note méthodologique (règle ≥5 pp, ≥2/3, exigence de comparabilité).
- La section « promedios Likert » actuelle reste inchangée en aval.

**4. Analyse assistée (`generate-section-text`)**

- Étendre le payload envoyé à l'endpoint avec `melIndicator: { pctInstitucionesCumplen, meta: 80, porInstitucion: [...] }` pour que la narrative auto commente aussi l'indicateur MEL (pas de changement backend nécessaire, l'endpoint reçoit déjà un JSON libre).

## Détails techniques

- Points de pourcentage = valeurs 0-100 (pas 0-1) pour rester lisibles à l'écran comme dans le tableau MEL.
- Ignorer les réponses vides / hors nomenclature dans le dénominateur de `pctS` et `pctN`.
- Une institution sans données dans une composante (base ou post) → composante = `no evaluable` → ne compte pas comme cumple.
- Une institution avec < 2 composantes évaluables → exclue de l'agrégat MEL, mentionnée dans la note.
- Variation muestral = `|nPost − nBase| / max(nBase, nPost)`. Si > 10 %, l'IE reste affichée mais un badge "muestra no comparable" apparaît et elle est exclue du % global (configurable via une case à cocher "Ignorar comparabilidad muestral" par défaut décochée).

## Vérification

1. Sélectionner une cohorte avec base + post → vérifier que le bloc "Indicador MEL" apparaît, avec `X/Y` cohérent.
2. Institution avec ΔS = +6 pp en Comunicación seulement → composante Comunicación ✓, autres ✗, institution ✗ (1/3 < 2).
3. Institution avec ΔN = −5 pp exact dans 2 composantes → cumple ✓.
4. Cohorte sans post → message clair "Sin datos de línea de salida" et pas de faux 0 %.
5. PDF téléchargé contient la section MEL + tableau + note ; la section Likert historique est toujours présente en dessous.
6. Question à confirmer avec le PO : Option A vs B pour l'agrégation multi-grupos (par défaut le plan implémente A).
