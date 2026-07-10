export interface Submission {
  tipo_formulario?: string;
  institucion_educativa?: string;
  respuestas: any;
}

export const SECTIONS_BY_FORM_KEYS = ["docentes", "estudiantes", "acudientes"] as const;
