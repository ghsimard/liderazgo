

## Plan: Move AI analysis button under the filters

**File: `src/components/admin/AdminSatisfaccionCommentsTab.tsx`**

Place the "Generar análisis IA" button in the filter bar area (after the three Select dropdowns and the comment count badge), rather than at the bottom of the comments list. The AI analysis card will render between the filters and the comment cards.

1. Add states: `aiAnalysis`, `aiLoading`. Reset analysis on filter change.
2. Add a `Button` with a `Sparkles` icon in the filter row (after the Badge), visible when `filtered.length > 0`.
3. On click, call `supabase.functions.invoke("generate-section-text")` with `sectionType: "bullet_list"`, up to 50 filtered comments, and filter context.
4. Render the analysis `Card` between the filter bar and the comments list.
5. Handle loading, 429/402 errors with toasts.

