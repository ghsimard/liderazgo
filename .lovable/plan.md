

## Plan: Rename "Auditor" to "Monitoreo"

### 1. Database Migration
Rename the enum value in `app_role` from `'auditor'` to `'monitoreo'`:
```sql
ALTER TYPE public.app_role RENAME VALUE 'auditor' TO 'monitoreo';
```
Update the two security-definer functions (`has_read_access`, `has_role`) to reference `'monitoreo'` instead of `'auditor'`.

### 2. Edge Functions (Supabase)
- **`supabase/functions/create-user/index.ts`**: Change `"auditor"` to `"monitoreo"` in role assignment logic.
- **`supabase/functions/manage-users/index.ts`**: Update role filter arrays from `"auditor"` to `"monitoreo"`.

### 3. Server Code (Render)
- **`server/middleware/auth.ts`**: Update `requireAdminOrViewer` query and comment to use `'monitoreo'`.
- **`server/routes/db.ts`**: Update any inline role checks referencing `'auditor'`.
- **`server/schema.sql`**: Update enum definition from `'auditor'` to `'monitoreo'`.

### 4. Frontend Code
- **`src/hooks/useAdminAuth.ts`**: Replace all `"auditor"` string comparisons with `"monitoreo"`.
- **`src/components/admin/AdminGestionCuentasTab.tsx`**: Update role value `"auditor"` to `"monitoreo"`, and display label `"Auditor"` to `"Monitoreo"` (including the select option text `"Auditor (solo lectura)"` → `"Monitoreo (solo lectura)"`).
- **`src/components/admin/AdminUsersTab.tsx`**: Change display label from `"Auditor"` to `"Monitoreo"`.
- **`src/components/admin/AdminSidebar.tsx`**: If there's any label referencing "Auditor", update to "Monitoreo".

### 5. Files NOT edited
- `src/integrations/supabase/types.ts` — auto-generated, will update after migration.

### Summary
~8 files modified + 1 DB migration. All references to the string `"auditor"` (as a role value) and the display label `"Auditor"` become `"monitoreo"` / `"Monitoreo"` respectively.

