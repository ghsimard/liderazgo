## Correctifs PDF « Informe por Institución »

Cause racine des guillemets/espacements bizarres : la police core helvetica de jsPDF (WinAnsi) ne supporte pas les caractères Unicode `Δ`, `−`, `≥`, `≤`, `▲`, `▼`, `×`. Ils sont rendus comme `"`, espaces ou lettres écartées. Solution : remplacer ces symboles par des équivalents ASCII dans toutes les chaînes affichées.

### 1. `src/utils/ambienteInstitucionPdfGenerator.ts` — page de couverture
- Titre cover : `"Informe Δ por Institución"` → `"Informe por Institución"` (centré, déjà via `align: center`).
- Supprimer les deux lignes `Fase Inicial: …` et `Fase Evolución: …` (et resserrer la carte info de 60 → ~46 mm de haut).
- Sous-titre du grand chiffre : `"Δ de la institución (Evolución − Inicial)"` → `"Variación de la institución (Evolución vs Inicial)"`.

### 2. `src/utils/ambienteInstitucionPdfGenerator.ts` — Resumen ejecutivo
- Libellé de la 3ᵉ KPI card : `"Δ Institución"` → `"Variación"`.
- Colonne tableau « Promedios por grupo » : entête `"Δ"` → `"Var."`.

### 3. `src/utils/ambienteDeltaPdfStyles.ts` — Sistema de calificación
Réécrire `NOTACION_PARAGRAPHS` en ASCII pur :
- `Δ` → `Variación`
- `≥` → `>=`, `≤` → `<=`, `−` → `-`
- `▲` → `(+)`, `▼` → `(-)`, `=` reste
- `ΔP` → `Variación`

### 4. Vérifications connexes
- Dans le PDF cohorte (`ambienteDeltaPdfGenerator.ts`), la même section « Sistema de calificación » bénéficie automatiquement du correctif #3.
- Aucune autre logique modifiée ; uniquement chaînes d'affichage et hauteur d'un bloc carte.

### Détails techniques
Fichiers modifiés :
- `src/utils/ambienteInstitucionPdfGenerator.ts` (cover band title, retrait dates, hauteur `roundedRect` 60→46, headline subtitle, KPI label, header colonne)
- `src/utils/ambienteDeltaPdfStyles.ts` (constante `NOTACION_PARAGRAPHS`)

Aucun changement backend, base de données, ni dépendance.

Action Render après publish : 🖥️ Site statique uniquement (redeploy front).