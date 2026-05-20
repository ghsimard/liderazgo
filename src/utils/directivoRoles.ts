/**
 * Centralized list of "directivo" cargos.
 * Stored values are gender-neutral (with /a suffix); UI flexes them via genderizeRole.
 */
export const DIRECTIVO_CARGOS = [
  "Rector/a",
  "Coordinador/a",
  "Director/a rural",
  "Director/a de núcleo",
] as const;

export type DirectivoCargo = (typeof DIRECTIVO_CARGOS)[number];
