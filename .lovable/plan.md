## Objectif

Permettre à l'admin de télécharger les résultats d'un reporte ad hoc sous forme de **ZIP** lorsque le volume est trop important pour un CSV/PDF direct (ex. > 500 lignes ou > 1 Mo).

## Comportement

1. **Seuil automatique** : si `row_count > 500` OU taille CSV estimée > 1 Mo, un nouveau bouton **"Descargar ZIP"** apparaît à côté de CSV/PDF.
2. **Action manuelle** : le bouton ZIP reste toujours disponible si l'usager le souhaite (même pour petits volumes).
3. **Contenu du ZIP** :
   - `datos.csv` — toutes les lignes (jusqu'à la limite 1000 actuelle)
   - `consulta.sql` — SQL généré
   - `metadata.txt` — pregunta, fecha, generado por, row_count, explicación
4. **Téléchargement client-side** : génération dans le navigateur, aucun upload serveur, conforme à la contrainte "PDF/exports jamais stockés sur serveur".

## Changements

### 🖥️ Site statique (Frontend)
- **Nouvelle dépendance** : `jszip` (déjà supportée par jsPDF stack, légère ~100 Ko).
- **Nouveau fichier** `src/utils/adhocReportZipExporter.ts` :
  - Fonction `exportAdhocReportZip({ question, sql, explanation, columns, rows, generatedBy })`.
  - Construit CSV (réutilise la logique de `adhocReportCsvExporter.ts`), ajoute `consulta.sql` et `metadata.txt`, déclenche le download via Blob.
- **`src/components/admin/AdminAdHocReportTab.tsx`** :
  - Ajouter bouton **"ZIP"** (icône `FileArchive`) à côté de CSV/PDF.
  - Calculer `shouldSuggestZip = result.row_count > 500` → afficher un petit badge "Recomendado" sur le bouton ZIP.
  - Handler `handleExportZip()` qui appelle le nouvel utilitaire.

### ⚙️ Web Service (Backend Express)
- Aucun changement. Le backend continue de renvoyer les lignes en JSON (limite 1000 inchangée).

### 🗄️ Base de données
- Aucun changement.

## Notes

- Limite serveur de 1000 lignes inchangée — le ZIP ne contourne pas la sécurité, il aide juste à manipuler de gros volumes hors-ligne.
- Si plus tard l'usager veut > 1000 lignes, ce sera un autre chantier (pagination serveur + streaming).
