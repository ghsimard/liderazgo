

## Plan: Fix Informe de Módulo PDF — Cover Page Separation & Header Logos

### Problems Identified

1. **Cover page not separate**: The `newPage()` function skips `addPage()` on its first call (`isFirstPage` flag), so Module content starts on the same page as the cover.
2. **No header logos on pages 2+**: The generator never calls `drawPageHeaderLogos()` from `pdfLogoHelper.ts`, even though the helper exists.

### Changes — `src/utils/informeModuloPdfGenerator.ts`

1. **Build a `LoadedLogos` object** from the existing `imgMap` so we can use the standardized helper functions (`drawPageHeaderLogos`, `drawFooterCosmo`).

2. **Fix `newPage()`**: Always call `addPage()` after the cover (remove the `isFirstPage` skip logic). Draw header logos at the top of every new page.

3. **Fix `ensureSpace()`**: When a page break is triggered mid-content, also draw header logos on the new page and adjust `y` to start below them (`CONTENT_START_Y`).

4. **Cover page**: Keep as-is (logos centered, title, region, date), ensure `addFooter()` is called, then content pages naturally start on page 2 with header logos.

### Files Modified

| File | Change |
|------|--------|
| `src/utils/informeModuloPdfGenerator.ts` | Fix page break logic, add header logos on all interior pages |

