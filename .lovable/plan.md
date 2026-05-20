# Ajout de cargos directifs dans la Fiche d'Information de Base

## Objectif

Ajouter deux nouveaux cargos au sélecteur « Cargo actual » de la Fiche, en plus des actuels :

- Rector/a (existant)
- Coordinador/a (existant)
- **Director/a rural** (nouveau)
- **Director/a de núcleo** (nouveau)

Les quatre cargos sont considérés comme **directifs à part entière** : ils doivent participer à tous les modules (Encuestas 360, Asistencia, Informe, MEL, Reportes, Dashboard, Rúbricas, etc.) exactement comme Rector/a et Coordinador/a aujourd'hui.

## Portée fonctionnelle

- Disponibles dans **toutes les régions** du sélecteur de la Fiche publique et de l'édition Admin.
- Exception maintenue : la région « Quibdó 2026 » continue de forcer « Rector/a » (inchangé).
- Étiquettes avec flexion de genre dans l'UI via `genderizeRole` (« Director rural » / « Directora rural », « Director de núcleo » / « Directora de núcleo »). La valeur stockée en BDD reste neutre (« Director/a rural », « Director/a de núcleo »).

## Changements nécessaires

### 🖥️ Site statique (Frontend)

1. **Sélecteur de cargo dans la Fiche publique** — `src/pages/FichaRLT.tsx`
   - Ajouter les deux nouvelles options au `FormSelect` de `cargo_actual`.

2. **Édition Admin de la Fiche** — `src/pages/AdminEditFicha.tsx`
   - Répliquer les deux nouvelles options dans le même sélecteur.

3. **Flexion de genre** — `src/utils/genderizeRole.ts`
   - Ajouter les règles : `Director\/a rural` → « Director rural » / « Directora rural », `Director\/a de núcleo` → « Director de núcleo » / « Directora de núcleo ». (Les règles existantes pour « Director/a » couvrent partiellement, mais il faut assurer la correspondance exacte des nouvelles étiquettes composées.)

4. **Listes de filtres « directivos »** — mettre à jour tous les `.in("cargo_actual", [...])` pour inclure les 4 cargos. Fichiers affectés :
   - `src/data/encuesta360Data.ts`
   - `src/utils/melRubricaCalculator.ts`
   - `src/components/admin/AdminEvalIndividualTab.tsx`
   - `src/components/admin/AdminEncuestaMonitor.tsx`
   - `src/components/admin/AdminDashboardTab.tsx`
   - `src/components/admin/AdminMelRubricasTab.tsx`
   - `src/components/admin/AdminReporte360Tab.tsx`
   - `src/components/admin/AdminAsistenciaTab.tsx`
   - `src/components/admin/AdminInformeReportTab.tsx`
   - `src/components/admin/AdminEvaluadoresTab.tsx`
   - `src/components/admin/AdminAsistenciaStats.tsx`
   - `src/components/admin/AdminMelTab.tsx`
   - `src/components/admin/AdminInformeModuloForm.tsx`
   - Pour éviter de maintenir la liste à 13 endroits, centraliser la constante dans `src/utils/genderizeRole.ts` (ou un nouveau `src/utils/directivoRoles.ts`) en exportant `DIRECTIVO_CARGOS = ["Rector/a", "Coordinador/a", "Director/a rural", "Director/a de núcleo"]` et l'importer dans tous les points ci-dessus.

### ⚙️ Web Service (Backend Express)

1. **Filtres côté serveur dans le proxy RPC** — `server/routes/rpc.ts` (3 occurrences aux lignes ~41, ~159, ~203) :
   - Remplacer `IN ('Rector/a', 'Coordinador/a')` par `IN ('Rector/a', 'Coordinador/a', 'Director/a rural', 'Director/a de núcleo')`.
   - Affecte les fonctions : `get_directivos_por_institucion`, validation de la cédula du directif, etc.

2. **Schéma documentaire** — `server/schema.sql` (2 occurrences aux lignes ~357, ~652) :
   - Mettre à jour les `IN (...)` dans les fonctions SQL versionnées pour que le fichier reflète la réalité de la production.

### 🗄️ Base de données (SQL manuel sur Render)

Pas de changement de schéma (la colonne `cargo_actual` est `text` libre).

Cependant, les fonctions SQL `get_directivos_por_institucion(p_nombre_ie)` et `check_cedula_role(p_cedula)` sont déployées dans la BDD de production avec la liste fermée de deux cargos. Pour qu'elles reconnaissent les nouveaux cargos, exécuter **manuellement** dans l'éditeur SQL de la base :

```sql
CREATE OR REPLACE FUNCTION public.get_directivos_por_institucion(p_nombre_ie text)
RETURNS TABLE(cargo_actual text, nombres_apellidos text, numero_cedula text, genero text)
LANGUAGE sql STABLE AS $$
  SELECT cargo_actual, nombres_apellidos, numero_cedula, genero
  FROM fichas_rlt
  WHERE nombre_ie = p_nombre_ie
    AND cargo_actual IN ('Rector/a','Coordinador/a','Director/a rural','Director/a de núcleo')
  ORDER BY nombres_apellidos;
$$;

CREATE OR REPLACE FUNCTION public.check_cedula_role(p_cedula text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'exists_ficha', EXISTS (SELECT 1 FROM fichas_rlt WHERE numero_cedula = p_cedula),
    'is_admin',     EXISTS (SELECT 1 FROM admin_cedulas WHERE cedula = p_cedula),
    'is_directivo', EXISTS (
      SELECT 1 FROM fichas_rlt
      WHERE numero_cedula = p_cedula
        AND cargo_actual IN ('Rector/a','Coordinador/a','Director/a rural','Director/a de núcleo')
    ),
    'is_evaluador', EXISTS (SELECT 1 FROM rubrica_evaluadores WHERE cedula = p_cedula),
    'is_operator',  EXISTS (SELECT 1 FROM operator_permissions WHERE cedula = p_cedula),
    'cargo_actual', (SELECT cargo_actual FROM fichas_rlt WHERE numero_cedula = p_cedula LIMIT 1),
    'nombre', COALESCE(
      (SELECT nombres_apellidos FROM fichas_rlt WHERE numero_cedula = p_cedula LIMIT 1),
      (SELECT nombre FROM rubrica_evaluadores WHERE cedula = p_cedula LIMIT 1)
    ),
    'genero', (SELECT genero FROM fichas_rlt WHERE numero_cedula = p_cedula LIMIT 1)
  );
$$;
```

## Impact sur les modules existants

Une fois appliqué, les nouveaux cargos :

- Peuvent se connecter en tant que directifs via la cédula.
- Apparaissent dans les Encuestas 360 (Auto-évaluation, évaluateurs, monitor, rapports).
- Apparaissent dans Asistencia, Informe, MEL, Rúbricas, Dashboard, Reporte 360.
- Sont reconnus par le flux de vérification de la Fiche et par « Mi Panel ».

Aucune migration de données requise : les fiches existantes avec « Rector/a » ou « Coordinador/a » ne sont pas affectées.

## Détails techniques

- Maintenir les valeurs stockées avec le suffixe `/a` pour la cohérence avec le schéma de genre actuel (`genderizeRole` les fléchit dans l'UI).
- La centralisation de `DIRECTIVO_CARGOS` réduit le risque d'oublier un point lors d'ajouts futurs.
- Aucun fichier auto-généré n'est touché (`src/integrations/supabase/types.ts`, `.env`).
