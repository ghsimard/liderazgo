import { supabase } from "@/utils/dbClient";
import { isCentroEducativo } from "@/utils/institutionType";

/** Mínimos requeridos por tipo de formulario en la Encuesta 360°. */
export const ROLE_LIMITS: Record<string, { min: number; max: number; label: string }> = {
  autoevaluacion: { min: 1, max: 1, label: "Autoevaluación" },
  directivo: { min: 1, max: 1, label: "Directivo Par" },
  docente: { min: 1, max: 1, label: "Docente" },
  administrativo: { min: 1, max: 1, label: "Administrativo" },
  estudiante: { min: 1, max: 1, label: "Estudiante" },
  acudiente: { min: 1, max: 1, label: "Acudiente" },
};

export const ROLE_KEYS = Object.keys(ROLE_LIMITS);

export interface Excepcion360 {
  institucion: string;
  sin_estudiantes: boolean;
  sin_administrativos: boolean;
}

/** Mapa normalizado (minúsculas, sin espacios extra) institución → excepción. */
export type ExcepcionesMap = Map<string, Excepcion360>;

const norm = (s: string | null | undefined): string =>
  (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

export async function fetchExcepciones360(): Promise<ExcepcionesMap> {
  const { data } = await supabase
    .from("encuesta_360_excepciones")
    .select("institucion, sin_estudiantes, sin_administrativos");
  const map: ExcepcionesMap = new Map();
  (data ?? []).forEach((e: any) => {
    map.set(norm(e.institucion), {
      institucion: e.institucion,
      sin_estudiantes: !!e.sin_estudiantes,
      sin_administrativos: !!e.sin_administrativos,
    });
  });
  return map;
}

/**
 * Roles exigidos para una institución.
 * - Centros Educativos: no se exigen "estudiante" ni "administrativo".
 * - Excepciones manuales registradas por el equipo administrador.
 */
export function roleKeysForInstitucion(
  institucion: string,
  excepciones?: ExcepcionesMap
): string[] {
  const exc = excepciones?.get(norm(institucion));
  const ce = isCentroEducativo(institucion);
  // Una excepción manual registrada tiene prioridad sobre la regla automática.
  const sinEstudiantes = exc ? !!exc.sin_estudiantes : ce;
  const sinAdministrativos = exc ? !!exc.sin_administrativos : ce;
  return ROLE_KEYS.filter(
    (k) =>
      !(k === "estudiante" && sinEstudiantes) &&
      !(k === "administrativo" && sinAdministrativos)
  );
}

/** Etiquetas de los roles que aún no alcanzan el mínimo. */
export function rolesFaltantes(
  institucion: string,
  counts: Record<string, number>,
  excepciones?: ExcepcionesMap
): string[] {
  return roleKeysForInstitucion(institucion, excepciones)
    .filter((k) => (counts[k] || 0) < ROLE_LIMITS[k].min)
    .map((k) => ROLE_LIMITS[k].label);
}
