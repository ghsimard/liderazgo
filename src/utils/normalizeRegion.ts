/**
 * Normalize region names for tolerant comparison.
 * Strips accents, lowercases, removes trailing year suffix (e.g. " 2026"),
 * and trims whitespace. Used to reconcile labels coming from `regiones.nombre`
 * (which may include a year suffix) with values stored in `*.region` columns
 * (filled from `fichas_rlt.region` without suffix).
 */
export const normalizeRegion = (s: string | null | undefined): string =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\d{4}\s*$/, "")
    .trim();

/** Returns true when two region labels match after normalization. */
export const regionsMatch = (a: string | null | undefined, b: string | null | undefined): boolean =>
  normalizeRegion(a) === normalizeRegion(b);
