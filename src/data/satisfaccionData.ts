/**
 * Satisfaction survey data for 3 form types:
 * - Asistencia (per-session feedback)
 * - Interludio (inter-module reflection)
 * - Intensivo (intensive module feedback)
 *
 * Each form is filled once per module (1-4).
 */

export type QuestionType = "radio" | "checkbox-max3" | "likert4" | "grid-sino" | "grid-frequency" | "grid-logistic" | "textarea" | "date" | "text";

export interface SatisfaccionOption {
  value: string;
  label: string;
}

export interface SatisfaccionQuestion {
  key: string;
  label: string;
  type: QuestionType;
  options?: SatisfaccionOption[];
  /** For grid types: rows of questions */
  rows?: { key: string; label: string }[];
  /** For grid types: column options */
  columns?: SatisfaccionOption[];
  required?: boolean;
  maxSelect?: number;
  /** Show this question only when another question has a specific value */
  conditionalOn?: { key: string; value: string };
}

export interface SatisfaccionSection {
  title: string;
  description?: string;
  questions: SatisfaccionQuestion[];
}

export interface SatisfaccionFormDef {
  formType: "asistencia" | "interludio" | "intensivo";
  title: string;
  description: string;
  sections: SatisfaccionSection[];
}

// ── Scales ──
const LIKERT4_AGREEMENT: SatisfaccionOption[] = [
  { value: "1", label: "Totalmente en desacuerdo" },
  { value: "2", label: "Algo en desacuerdo" },
  { value: "3", label: "Algo de acuerdo" },
  { value: "4", label: "Totalmente de acuerdo" },
];

const SINO_PARCIAL: SatisfaccionOption[] = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
  { value: "parcialmente", label: "Parcialmente" },
];

const FREQUENCY4: SatisfaccionOption[] = [
  { value: "siempre", label: "Siempre" },
  { value: "algunas_veces", label: "Algunas veces" },
  { value: "casi_nunca", label: "Casi nunca" },
  { value: "nunca", label: "Nunca" },
];

const LIKERT4_SATISFACTION: SatisfaccionOption[] = [
  { value: "1", label: "Muy insatisfecho" },
  { value: "2", label: "Insatisfecho" },
  { value: "3", label: "Satisfecho" },
  { value: "4", label: "Muy satisfecho" },
];

// ═══════════════════════════════════════════════════════════
// ASISTENCIA
// ═══════════════════════════════════════════════════════════
export const asistenciaForm: SatisfaccionFormDef = {
  formType: "asistencia",
  title: "Registro de asistencia - RLT - CLT",
  description: "En el marco del Programa Rectores Líderes Transformadores y Coordinadores Líderes Transformadores, queremos llevar un control organizado de la asistencia a los eventos programados.\n\nEste formulario tiene como único propósito registrar su participación en dichas actividades. La información que usted proporcione será confidencial y se utilizará únicamente para fines administrativos.\n\nAgradecemos su compromiso y participación activa.",
  sections: [
    {
      title: "Información de la sesión",
      questions: [
        {
          key: "tipo_actividad",
          label: "Elige la actividad en la que estás participando hoy",
          type: "radio",
          required: true,
          options: [
            { value: "intercambio_pares", label: "Intercambio de pares" },
            { value: "sesion_grupal_coaching", label: "Sesión grupal de coaching" },
          ],
        },
        {
          key: "grupo",
          label: "¿A qué grupo perteneces?",
          type: "radio",
          required: true,
          options: [
            { value: "1", label: "Grupo 1" },
            { value: "2", label: "Grupo 2" },
            { value: "3", label: "Grupo 3" },
          ],
        },
      ],
    },
    {
      title: "Valoración de la sesión",
      questions: [
        {
          key: "objetivo_cumplido",
          label: "¿Se cumplió el objetivo del encuentro?",
          type: "likert4",
          options: LIKERT4_AGREEMENT,
          required: true,
        },
        {
          key: "valor_sesion",
          label: "¿La sesión agrega valor a su proceso de liderazgo transformador?",
          type: "likert4",
          options: LIKERT4_AGREEMENT,
          required: true,
        },
      ],
    },
    {
      title: "Comentarios",
      questions: [
        {
          key: "comentarios",
          label: "Déjenos sus comentarios",
          type: "textarea",
          required: true,
        },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// INTERLUDIO
// ═══════════════════════════════════════════════════════════
export const interludioForm: SatisfaccionFormDef = {
  formType: "interludio",
  title: "Encuesta de Satisfacción — Interludio",
  description: "Evalúe su experiencia durante el período de interludio.",
  sections: [
    {
      title: "Actividades más valiosas",
      description: "Seleccione las 3 actividades que más le aportaron durante el interludio.",
      questions: [
        {
          key: "top3_actividades",
          label: "Seleccione máximo 3 actividades",
          type: "checkbox-max3",
          maxSelect: 3,
          required: true,
          options: [
            { value: "sesion_grupal_coaching", label: "Sesión grupal de coaching" },
            { value: "intercambio_pares", label: "Intercambio de pares" },
            { value: "acompanamiento_individual", label: "Acompañamiento individual (coaching)" },
            { value: "acompanamiento_sitio", label: "Acompañamiento en sitio" },
            { value: "comunidad_practica", label: "Comunidad de práctica" },
            { value: "actividades_autoformacion", label: "Actividades de autoformación" },
            { value: "reto_estrategico", label: "Reto estratégico" },
          ],
        },
      ],
    },
    {
      title: "Logros del interludio",
      questions: [
        {
          key: "logros",
          label: "",
          type: "grid-sino",
          rows: [
            { key: "logro_objetivos", label: "Se cumplieron los objetivos planteados para el interludio." },
            { key: "logro_herramientas", label: "Las herramientas y recursos proporcionados fueron útiles." },
            { key: "logro_acompanamiento", label: "El acompañamiento recibido fue oportuno y pertinente." },
            { key: "logro_comunidad", label: "Participé activamente en la comunidad de práctica." },
            { key: "logro_reto", label: "Avancé significativamente en mi reto estratégico." },
          ],
          columns: SINO_PARCIAL,
          required: true,
        },
      ],
    },
    {
      title: "Frecuencia del facilitador",
      description: "¿Con qué frecuencia el/la facilitador(a)...",
      questions: [
        {
          key: "frecuencia_facilitador",
          label: "",
          type: "grid-frequency",
          rows: [
            { key: "fac_retroalimentacion", label: "Brindó retroalimentación oportuna." },
            { key: "fac_escucha", label: "Mostró escucha activa y empatía." },
            { key: "fac_motivacion", label: "Motivó mi participación en las actividades." },
            { key: "fac_comunicacion", label: "Mantuvo una comunicación clara y constante." },
          ],
          columns: FREQUENCY4,
          required: true,
        },
      ],
    },
    {
      title: "Frecuencia del coach",
      description: "¿Con qué frecuencia el/la coach...",
      questions: [
        {
          key: "frecuencia_coach",
          label: "",
          type: "grid-frequency",
          rows: [
            { key: "coach_orientacion", label: "Brindó orientación pertinente para mi práctica." },
            { key: "coach_reflexion", label: "Promovió la reflexión sobre mi gestión." },
            { key: "coach_seguimiento", label: "Realizó seguimiento a mis compromisos." },
          ],
          columns: FREQUENCY4,
          required: true,
        },
      ],
    },
    {
      title: "Autoevaluación",
      description: "¿Con qué frecuencia usted...",
      questions: [
        {
          key: "autoevaluacion",
          label: "",
          type: "grid-frequency",
          rows: [
            { key: "auto_tareas", label: "Cumplí con las tareas y compromisos asumidos." },
            { key: "auto_tiempo", label: "Dediqué tiempo suficiente a las actividades del programa." },
            { key: "auto_aprendizajes", label: "Apliqué los aprendizajes en mi institución." },
            { key: "auto_participacion", label: "Participé activamente en las sesiones programadas." },
          ],
          columns: FREQUENCY4,
          required: true,
        },
      ],
    },
    {
      title: "Comentarios",
      questions: [
        {
          key: "comentarios",
          label: "¿Tiene algún comentario o sugerencia sobre el interludio?",
          type: "textarea",
        },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// INTENSIVO
// ═══════════════════════════════════════════════════════════
export const intensivoForm: SatisfaccionFormDef = {
  formType: "intensivo",
  title: "Encuesta de Satisfacción — Intensivo",
  description: "Evalúe su experiencia durante el módulo intensivo.",
  sections: [
    {
      title: "Actividades más valiosas",
      description: "Seleccione las 3 actividades que más le aportaron durante el intensivo.",
      questions: [
        {
          key: "top3_actividades",
          label: "Seleccione máximo 3 actividades",
          type: "checkbox-max3",
          maxSelect: 3,
          required: true,
          options: [
            { value: "conferencia_magistral", label: "Conferencia magistral" },
            { value: "taller_practico", label: "Taller práctico" },
            { value: "panel_expertos", label: "Panel de expertos" },
            { value: "trabajo_grupal", label: "Trabajo grupal" },
            { value: "plenaria", label: "Plenaria" },
            { value: "coaching_grupal", label: "Coaching grupal" },
            { value: "intercambio_experiencias", label: "Intercambio de experiencias" },
            { value: "actividad_cultural", label: "Actividad cultural" },
            { value: "reto_estrategico", label: "Reto estratégico" },
            { value: "autoformacion", label: "Actividad de autoformación" },
            { value: "socializacion_reto", label: "Socialización del reto" },
            { value: "actividad_bienestar", label: "Actividad de bienestar" },
          ],
        },
      ],
    },
    {
      title: "Logros del intensivo",
      questions: [
        {
          key: "logros",
          label: "",
          type: "grid-sino",
          rows: [
            { key: "logro_objetivos", label: "Se cumplieron los objetivos planteados para el intensivo." },
            { key: "logro_contenidos", label: "Los contenidos abordados fueron pertinentes para mi gestión." },
            { key: "logro_metodologia", label: "La metodología utilizada facilitó el aprendizaje." },
            { key: "logro_tiempo", label: "El tiempo asignado a las actividades fue adecuado." },
            { key: "logro_materiales", label: "Los materiales y recursos proporcionados fueron útiles." },
          ],
          columns: SINO_PARCIAL,
          required: true,
        },
      ],
    },
    {
      title: "Frecuencia del equipo de formación",
      description: "¿Con qué frecuencia el equipo de formación...",
      questions: [
        {
          key: "frecuencia_equipo",
          label: "",
          type: "grid-frequency",
          rows: [
            { key: "equipo_claridad", label: "Presentó los contenidos con claridad." },
            { key: "equipo_participacion", label: "Promovió la participación activa." },
            { key: "equipo_escucha", label: "Mostró disposición para escuchar y resolver inquietudes." },
            { key: "equipo_retroalimentacion", label: "Brindó retroalimentación oportuna." },
            { key: "equipo_ambiente", label: "Generó un ambiente de confianza y respeto." },
          ],
          columns: FREQUENCY4,
          required: true,
        },
      ],
    },
    {
      title: "Logística",
      description: "Evalúe los siguientes aspectos logísticos.",
      questions: [
        {
          key: "logistica",
          label: "",
          type: "grid-logistic",
          rows: [
            { key: "log_lugar", label: "El lugar del encuentro fue adecuado." },
            { key: "log_alimentacion", label: "La alimentación fue satisfactoria." },
            { key: "log_transporte", label: "El transporte fue adecuado." },
            { key: "log_alojamiento", label: "El alojamiento fue satisfactorio." },
            { key: "log_organizacion", label: "La organización general fue buena." },
            { key: "log_comunicacion", label: "La comunicación previa fue oportuna." },
          ],
          columns: LIKERT4_SATISFACTION,
          required: true,
        },
      ],
    },
    {
      title: "Autoevaluación",
      description: "¿Con qué frecuencia usted...",
      questions: [
        {
          key: "autoevaluacion",
          label: "",
          type: "grid-frequency",
          rows: [
            { key: "auto_participacion", label: "Participé activamente en las actividades." },
            { key: "auto_puntualidad", label: "Fui puntual en las sesiones." },
            { key: "auto_disposicion", label: "Mostré disposición para aprender y compartir." },
            { key: "auto_aplicacion", label: "Identifiqué formas de aplicar lo aprendido." },
          ],
          columns: FREQUENCY4,
          required: true,
        },
      ],
    },
    {
      title: "Comentarios",
      questions: [
        {
          key: "comentarios_tematica",
          label: "¿Qué temática le gustaría que se abordara en futuros módulos?",
          type: "textarea",
        },
        {
          key: "comentarios_generales",
          label: "¿Tiene algún comentario o sugerencia adicional?",
          type: "textarea",
        },
      ],
    },
  ],
};

export const SATISFACCION_FORMS: Record<string, SatisfaccionFormDef> = {
  asistencia: asistenciaForm,
  interludio: interludioForm,
  intensivo: intensivoForm,
};

export const FORM_TYPE_LABELS: Record<string, string> = {
  asistencia: "Asistencia",
  interludio: "Interludio",
  intensivo: "Intensivo",
};

/**
 * Load a form definition from DB (custom) or fall back to static default.
 * Used by public-facing satisfaction pages.
 */
export async function loadFormDefinition(
  formType: string,
  supabaseClient: { from: (table: string) => any }
): Promise<SatisfaccionFormDef> {
  try {
    const { data } = await supabaseClient
      .from("satisfaccion_form_definitions")
      .select("definition")
      .eq("form_type", formType)
      .maybeSingle();
    if (data?.definition) return data.definition as SatisfaccionFormDef;
  } catch {
    // fallback to static
  }
  return SATISFACCION_FORMS[formType] || asistenciaForm;
}
