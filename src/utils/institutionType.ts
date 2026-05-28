/**
 * Determina si una institución es un Centro Educativo (CE) en lugar de una
 * Institución Educativa (IE), basándose en el prefijo del nombre.
 *
 * Reglas (insensible a mayúsculas/minúsculas, tras trim):
 *  - "CE " (ej. "CE La Esperanza")
 *  - "Centro Educativo" (ej. "Centro Educativo Rural Bellavista")
 */
export function isCentroEducativo(nombreIe: string | null | undefined): boolean {
  if (!nombreIe) return false;
  const n = nombreIe.trim().toLowerCase();
  return n.startsWith("ce ") || n.startsWith("centro educativo");
}

/**
 * Devuelve true solo si la institución es un Centro Educativo
 * Y pertenece a la región/entidad territorial de Quibdó.
 * Usado para excluir el formulario "Estudiante" únicamente en CE de Quibdó.
 */
export function isQuibdoCentroEducativo(
  nombreIe: string | null | undefined,
  regionOrEntidad: string | null | undefined,
): boolean {
  if (!isCentroEducativo(nombreIe)) return false;
  const r = (regionOrEntidad ?? "").toLowerCase();
  return r.includes("quibdó") || r.includes("quibdo");
}
