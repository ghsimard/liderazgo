

## Plan: Supprimer le bouton Export SQL

### Justification
- Fonctionnalité très niche, rarement utilisée
- Risque de sécurité (expose le schéma complet + données)
- Le backend permet déjà d'accéder aux données directement
- Simplifie l'interface admin

### Changements

**1. `src/pages/AdminPage.tsx`**
- Supprimer le bouton "Export SQL" et sa fonction `exportDatabaseToSql`
- Supprimer l'import `Database` de lucide-react s'il n'est plus utilisé ailleurs

**2. `src/data/rbacSections.ts`** (si applicable)
- Supprimer la sous-section `sistema.export-sql` si elle a été ajoutée

**3. `supabase/functions/export-database/index.ts`** (optionnel)
- Supprimer l'edge function associée pour nettoyer le code mort

