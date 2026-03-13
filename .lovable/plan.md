

## Plan: Rapport PDF Ambiente Escolar — Téléchargement individuel et ZIP par région

### Contexte
Le rapport PDF "Informe de Resultados" (~8 pages) sera générable individuellement par école, ou en masse par région dans un ZIP. Le pattern suit exactement celui de AdminReporte360Tab / AdminMelTab (JSZip + filtres en cascade).

### Fichiers à créer

#### 1. `src/data/ambienteEscolarReportData.ts`
- Textes explicatifs des 3 composantes (Comunicación, Prácticas Pedagógicas, Convivencia)
- Question mappings cross-acteur reliant les IDs de `ambienteEscolarData.ts` aux items neutres du rapport
- Constantes de couleurs S/A/N

#### 2. `src/utils/ambienteEscolarReportPdfGenerator.ts`
Générateur jsPDF complet (~1200 lignes) avec 6 sections :
- **Couverture** : logos RLT/CLT/Cosmo, titre, nom école sur fond bleu, entidad territorial
- **Pages explicatives** : texte statique sur les 3 composantes
- **Encuestados** : graphiques démographiques via canvas temporaire (camemberts grados/jornada, barres años/retroalimentación)
- **Resumen General** : barres empilées S/A/N par rôle et section
- **Fortalezas y Retos** : tableau détaillé avec formatage conditionnel (orange si S<50%), zone de retos vide
- **Footer** : logo Cosmo + pagination

La fonction principale accepte un paramètre `returnBlob?: boolean` pour permettre l'export ZIP (même pattern que `generarReporte360PDF` et `generarMelPDF`).

#### 3. Modifier `src/components/admin/AdminAmbienteStatsTab.tsx`
Ajouter dans l'onglet Estadísticas :
- **Filtres en cascade** : Région → Entidad Territorial → Institución (via MultiSelect, même pattern que AdminReporte360Tab)
- **Bouton "Generar Informe"** par école (actif quand une école spécifique est sélectionnée) → ouvre RegionPdfPicker → télécharge le PDF individuel
- **Bouton "Exportar ZIP"** : génère tous les PDFs des écoles filtrées dans un ZIP (avec barre de progression), en appliquant les logos par région automatiquement
- Charge les données de `fichas_rlt` (entidad_territorial, region) pour mapper les écoles aux régions

### Détails techniques
- Canvas temporaire pour camemberts (`arc()` → `toDataURL()` → `doc.addImage()`)
- Barres empilées S/A/N via `doc.rect()` directement
- Regroupement Likert : S = Siempre + Casi siempre, A = A veces, N = Casi nunca + Nunca
- Logos par région via `regiones.mostrar_logo_rlt/mostrar_logo_clt` (pré-chargés en batch pour le ZIP)
- `returnBlob: true` retourne le Blob au lieu de déclencher un téléchargement (pour JSZip)
- Aucune migration de base de données requise

