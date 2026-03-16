

## Plan: Web diagram contrast fix + Print button alignment

### 1. Fix web diagram contrast (MermaidDiagram.tsx)

Tighten the `fixTextContrast` function to cover ALL nodes, not just extreme dark/light:
- **lum < 0.5** → white text (`#ffffff`)
- **lum >= 0.5** → dark text (`#1e293b`)

This eliminates the dead zone where medium-toned nodes (e.g., mid-grays, medium blues) keep their original text color unchanged.

### 2. Print button decision

The "Imprimir" button currently triggers `window.print()` (browser native). Two options:

- **Option A**: Keep as-is (browser print, different from PDF download)
- **Option B**: Remove the "Imprimir" button entirely since the PDF download already covers the use case, or redirect it to also generate the jsPDF version

**Recommendation**: Keep both buttons — they serve different purposes (quick print vs. archival PDF). No change needed.

### Files to modify
- `src/components/MermaidDiagram.tsx` — adjust luminance thresholds in `fixTextContrast` to cover all cases (single line change: replace the if/else if with a simple threshold at 0.5)

