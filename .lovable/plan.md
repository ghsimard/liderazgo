

## Plan: Wrap each evaluador card in an accordion

**What changes**: Replace the current `Card` layout for each evaluador with a `Collapsible` (from `@/components/ui/collapsible`) so each evaluador section can be expanded/collapsed.

**File**: `src/components/admin/AdminEvaluadoresTab.tsx`

1. **Import** `Collapsible, CollapsibleContent, CollapsibleTrigger` from `@/components/ui/collapsible` and `ChevronDown` from `lucide-react`.

2. **Add state** to track which evaluadores are expanded:
   ```typescript
   const [expandedEvals, setExpandedEvals] = useState<Set<string>>(new Set());
   ```

3. **Refactor each evaluador Card** (around lines 260-310):
   - Wrap the `Card` content in a `Collapsible` component, keyed by `ev.id`
   - The `CardHeader` becomes the `CollapsibleTrigger` — clicking it toggles open/close
   - Add a chevron icon that rotates when expanded
   - The `CardContent` (containing the assignments table) goes inside `CollapsibleContent`
   - Action buttons (Asignar, Transferir, Delete) remain visible in the header
   - Show a small badge with assignment count in the header so it's visible even when collapsed

4. **All evaluadores start collapsed by default**, making the page compact. When searching, auto-expand matching evaluadores.

