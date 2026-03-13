

## Plan: Convertir "Autorización de datos personales" en Checkbox obligatoire

### Changements nécessaires dans `src/pages/FichaRLT.tsx`:

**1. Modification du schéma (ligne ~30)**
- Remplacer le `z.enum(["Sí", "No", ""])` par `z.literal(true)` avec message d'erreur personnalisé
- Le champ doit être exactement `true` (coché) pour passer la validation

**2. Valeurs par défaut (ligne ~109)**
- Changer `acepta_datos: "" as any` → `acepta_datos: false`

**3. Mapping DB → Formulaire (ligne ~467)**
- Changer `(data.acepta_datos ? "Sí" : "No")` → `!!data.acepta_datos` (conversion booléenne directe)

**4. Payload vers DB (ligne ~625)**
- Changer `data.acepta_datos === "Sí"` → `data.acepta_datos` (déjà booléen)

**5. Interface utilisateur (lignes ~980-996)**
- Remplacer le `FormRadioGroup` par un composant `Checkbox` avec label cliquable
- Le texte d'autorisation devient le label du checkbox
- Importer le composant `Checkbox` de `@/components/ui/checkbox`

**6. Imports**
- Ajouter l'import du `Checkbox` depuis les composants UI

### Impact sur les données existantes
**Aucun impact.** La colonne `acepta_datos` dans la table `fichas_rlt` est déjà un `boolean`. Les fiches existantes avec `true` resteront valides, celles avec `false` devront cocher la case pour soumettre à nouveau.

