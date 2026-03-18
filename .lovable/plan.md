

## Plan: Wrap each directivo in an Accordion in the "Evaluación Individual" tab

**Scope**: The "Evaluación Individual" tab (lines 746-822 in `src/pages/InformeModulo.tsx`) currently renders all directivos as stacked `div` blocks. We will wrap each directivo in an `Accordion` component so the evaluator can expand/collapse them individually.

**File to modify**: `src/pages/InformeModulo.tsx`

### Changes

1. **Add import** for `Accordion, AccordionItem, AccordionTrigger, AccordionContent` from `@/components/ui/accordion`.

2. **Replace the directivo listing** (lines ~753-816) in the `TabsContent value="evaluacion"` section:
   - Wrap all directivo items in `<Accordion type="multiple" className="space-y-2">`.
   - Each directivo becomes an `<AccordionItem>` with `value={ev.directivo_cedula}`.
   - The header line (Badge + nombre + IE) moves into `<AccordionTrigger>`.
   - The form fields (reto estratégico, razones, evaluation table) go inside `<AccordionContent>`.

3. **Visual styling**: Keep the existing `border rounded-lg p-4 bg-muted/10` styling on the AccordionItem. The trigger will show the directivo name, cédula badge, and IE. Content expands to reveal all form fields.

This is a UI-only change -- no backend or data logic modifications needed.

