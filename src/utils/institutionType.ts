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
