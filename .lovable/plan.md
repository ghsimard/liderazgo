## Diagnostic confirmé

Les deux captures confirment la cause :

- **Formulaire M2 en prod** (1ʳᵉ image) : options = *Socialización RLT y CLT, Trabajo colaborativo en la IE, El valor de ser…, Conversaciones transformadoras, Buzón del afecto, Intercambio entre pares, Sesión de coaching grupal*.
- **Stats M2** (2ᵉ image) : graphique basé sur les options M1 hard-codées (*Buzón del afecto, Construcción de acuerdos, Dimensiones del ser humano, Propósito de vida, Creencias limitantes, Actos lingüísticos, Modelo de responsabilidad personal, …, La evaluación en RLT y CLT*).

Seule l'option « Buzón del afecto » existe dans les deux listes → c'est la **seule barre non nulle** (10,64 %). Les 47 réponses sont bien lues, mais 12 des 13 libellés affichés ne correspondent à aucune valeur stockée.

### Cause technique

Dans `src/components/admin/AdminSatisfaccionStats.tsx` (ligne 69) :

```ts
const formDef = SATISFACCION_FORMS[filterType]; // statique = formulaire M1
```

Le formulaire rempli par les directivos passe par `loadFormDefinition(formType, moduleNumber, supabase)` qui suit la cascade : `(form_type, module_number)` → `(form_type, NULL)` → statique. En production, un override **M2-spécifique** existe dans `satisfaccion_form_definitions` avec d'autres `value` pour `top3_actividades`. Les stats ignorent cet override.

## Correction

### 🖥️ Site statique (Frontend)

**`src/components/admin/AdminSatisfaccionStats.tsx`**
1. Importer `loadFormDefinition` depuis `@/data/satisfaccionData`.
2. Remplacer la lecture statique par un état `formDef` chargé via `useEffect` à chaque changement de `filterType` / `filterModule` :
   - `filterModule === "all"` → charger la définition globale (`moduleNumber = null`).
   - Sinon → charger la définition spécifique au module (cascade).
3. Ajouter `formDef` aux dépendances du `useMemo(stats, …)`.
4. Mini-loader pendant la résolution du `formDef` pour éviter un flash de graphique vide.

**Audit des écrans frères** (appliquer le même fix si la même lecture statique est présente) :
- `src/components/admin/AdminSatisfaccionReportTab.tsx`
- `src/components/admin/AdminSatisfaccionCommentsTab.tsx`
- Tablero de Control (si agrégation Likert satisfaction par module).

La page publique (`SatisfaccionPage`) utilise déjà `loadFormDefinition` → pas de changement.

### ⚙️ Web Service (Backend Express)
Aucun changement. La table `satisfaccion_form_definitions` est déjà servie par le proxy `/api/db/:table`.

### 🗄️ Base de données (Manual SQL)
Aucune migration. Les overrides M2 (et probablement M3/M4) sont déjà la source de vérité.

## Vérification post-déploiement

SQL pour confirmer la présence des overrides par module :

```sql
SELECT form_type, module_number,
       jsonb_path_query_array(
         definition,
         '$.sections[*].questions[*] ? (@.key == "top3_actividades").options[*].value'
       ) AS top3_values
FROM satisfaccion_form_definitions
WHERE form_type = 'intensivo'
ORDER BY module_number NULLS FIRST;
```

Après déploiement, ouvrir `Admin → Satisfacciones → Estadísticas`, Intensivo, Módulo 2 : les 7 actividades du formulaire M2 (Socialización RLT y CLT, Trabajo colaborativo en la IE, etc.) doivent apparaître avec leurs vrais pourcentages, et la somme par directivo (max 3 sélections / 47 répondants) doit être cohérente.
