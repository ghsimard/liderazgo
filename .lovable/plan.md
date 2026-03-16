

## Plan: Fix PDF orphan titles, black circle text, and footer

### Problems identified

1. **Orphan titles**: The keep-together algorithm is too conservative — the `steps < 4` sibling walk and `groupH < 900px` height cap cause many heading+content groups to be missed, especially when there are intermediate paragraphs between the heading and its diagram/table.

2. **Black circles need white text**: `DARK_FILLS` array only includes blue shades. Mindmap nodes rendered as black (`#000000`, `#000`, `rgb(0,0,0)`) are not handled — text inside remains black and invisible.

3. **Footer shows page number only**: Need to replace with document title + version datetime instead of URL (no URL is currently shown, but the request is to add title+datetime).

### Changes

#### 1. `src/utils/specificationsPdfGenerator.ts`

**findKeepTogetherZones improvements:**
- Increase sibling walk limit from 4 to 8 steps to catch headings followed by paragraphs then a diagram/table
- Increase max zone height from 900px to ~1200px (to accommodate larger diagrams with their heading)
- Also include `p` tags in the walk (don't stop at first paragraph, continue to find the diagram/table after it)

**Black fills in onclone SVG processing:**
- Add `#000000`, `#000`, and other dark/black fills to the `DARK_FILLS` array so white text is forced on black circles too

**Footer on each page:**
- Replace the `"X / Y"` page number text with `"Especificaciones RLT/CLT — {fecha y hora} — Pág. X / Y"`
- Generate the datetime string once at the top of the function

#### 2. `src/components/MermaidDiagram.tsx`

- Add black fills (`#000000`, `#000`) to the `DARK_FILLS` array in `fixWhiteTextOnDarkNodes` so web rendering also shows white text on black circles

### Files to modify
- `src/utils/specificationsPdfGenerator.ts` — keep-together logic, dark fills, footer format
- `src/components/MermaidDiagram.tsx` — add black to DARK_FILLS

