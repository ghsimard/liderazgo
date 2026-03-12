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
  description: "Esta encuesta de satisfacción tiene como propósito es identificar las fortalezas y oportunidades de mejora en la experiencia formativa, de cara a optimizar la planeación y ejecución de futuros procesos formativos.",
  sections: [
    {
      title: "Actividades más valiosas",
      description: "Pensando en tu formación como Líder Transformador, ¿cuáles fueron las tres actividades que más te aportaron? Elige tus favoritas de esta lista.",
      questions: [
        {
          key: "top3_actividades",
          label: "Seleccione máximo 3 actividades",
          type: "checkbox-max3",
          maxSelect: 3,
          required: true,
          options: [
            { value: "buzon_afecto", label: "Buzón del afecto" },
            { value: "construccion_acuerdos", label: "Construcción de acuerdos" },
            { value: "valor_ser_reloj", label: "El valor de ser y de ser con otros – El reloj" },
            { value: "dimensiones_ser", label: "Dimensiones del ser humano" },
            { value: "proposito_vida", label: "Propósito de vida (mapa de mi vida en la escuela, mandala, rueda de roles, declaración de propósito)" },
            { value: "creencias_limitantes", label: "Creencias limitantes y expansivas" },
            { value: "actos_linguisticos", label: "Actos lingüísticos" },
            { value: "modelo_responsabilidad", label: "Modelo de responsabilidad personal" },
            { value: "conversaciones_transformadoras", label: "Conversaciones transformadoras y retroalimentación efectiva" },
            { value: "trabajo_colaborativo", label: "Trabajo colaborativo" },
            { value: "escuela_inclusiva", label: "Afinando la mirada: escuela inclusiva – enfoque apreciativo" },
            { value: "liderazgo_inclusivo", label: "Qué liderazgo es necesario para construir una escuela inclusiva" },
            { value: "evaluacion_rlt_clt", label: "La evaluación en RLT y CLT" },
          ],
        },
      ],
    },
    {
      title: "Desarrollo del intensivo",
      description: "Para cada pregunta que verás a continuación, por favor elige la respuesta que mejor refleje tu experiencia de acuerdo al desarrollo del intensivo.",
      questions: [
        {
          key: "desarrollo",
          label: "",
          type: "grid-sino",
          rows: [
            { key: "desarrollo_tematicas", label: "¿Las temáticas y actividades aportaron para fortalecer su liderazgo en la Institución Educativa?" },
            { key: "desarrollo_duracion", label: "¿La duración de las actividades fue suficiente para su desarrollo?" },
            { key: "desarrollo_objetivos", label: "¿Se cumplieron los objetivos planteados inicialmente en el intensivo?" },
            { key: "desarrollo_agenda", label: "¿Se cumplió la agenda en relación con las actividades programadas?" },
            { key: "desarrollo_metodologia", label: "¿Fue efectiva la metodología utilizada en las distintas actividades?" },
          ],
          columns: SINO_PARCIAL,
          required: true,
        },
      ],
    },
    {
      title: "Equipo facilitador(es) y coach(es)",
      description: "Por favor seleccione la opción que considere más apropiada en cuanto a la frecuencia en que se dieron las siguientes situaciones con el equipo de facilitador(es) y coach(es).",
      questions: [
        {
          key: "equipo_facilitador",
          label: "",
          type: "grid-frequency",
          rows: [
            { key: "equipo_apropiacion", label: "¿Demostraron apropiación de los conceptos y temáticas abordadas en el intensivo?" },
            { key: "equipo_inquietudes", label: "¿Respondieron las preguntas e inquietudes de los participantes?" },
            { key: "equipo_tiempo", label: "¿Tuvieron un manejo efectivo del tiempo en las actividades?" },
            { key: "equipo_articulacion", label: "¿Trabajaron articuladamente con los otros miembros del equipo local?" },
            { key: "equipo_puntualidad", label: "¿Iniciaron y culminaron puntualmente las actividades?" },
          ],
          columns: FREQUENCY4,
          required: true,
        },
      ],
    },
    {
      title: "Logística",
      description: "Ahora, por favor seleccione la opción que considere más apropiada respecto a los aspectos logísticos del intensivo.",
      questions: [
        {
          key: "logistica",
          label: "",
          type: "grid-logistic",
          rows: [
            { key: "log_convocatoria", label: "¿La convocatoria para este intensivo me fue enviada oportunamente?" },
            { key: "log_agenda", label: "¿La agenda completa del intensivo se presentó el primer día?" },
            { key: "log_puntualidad", label: "¿Las actividades se desarrollaron con puntualidad?" },
            { key: "log_espacios", label: "¿Los espacios físicos utilizados fueron apropiados para las actividades desarrolladas?" },
            { key: "log_alimentacion", label: "¿El servicio de alimentación fue suficiente en cantidad y calidad?" },
            { key: "log_materiales", label: "¿Los materiales y recursos fueron suficientes en cantidad y en calidad para el desarrollo de las actividades?" },
          ],
          columns: LIKERT4_AGREEMENT,
          required: true,
        },
      ],
    },
    {
      title: "Autoevaluación",
      description: "Por favor seleccione la opción que considere más apropiada en cuanto a la frecuencia en que se dieron las siguientes situaciones en el intensivo.",
      questions: [
        {
          key: "autoevaluacion",
          label: "",
          type: "grid-frequency",
          rows: [
            { key: "auto_apertura", label: "Tuve una actitud de apertura frente a las actividades y participé activamente en ellas" },
            { key: "auto_horarios", label: "Colaboré para lograr el cumplimiento de los horarios y el desarrollo de las actividades" },
            { key: "auto_acuerdos", label: "Cumplí con los acuerdos construidos colectivamente con mis compañeros" },
            { key: "auto_inquietudes", label: "Manifesté mis inquietudes al equipo local y a mis compañeros, para aportar en las discusiones" },
          ],
          columns: FREQUENCY4,
          required: true,
        },
      ],
    },
    {
      title: "Comentarios y sugerencias",
      description: "A continuación encontrarás cuatro temas. Si considera que alguno de estos tiene oportunidades de mejora, por favor escribe el número del tema antes de tu comentario. Si no tienes observaciones sobre algún tema, puedes omitirlo.\n\n1. Desarrollo del intensivo\n2. Desempeño del equipo local facilitador(es) y coach(es)\n3. Organización logística\n4. Tu propia participación\n\nEjemplo:\n1. Podrían haber incluido más actividades prácticas.\n2. Sugiero mejorar la gestión de los tiempos en los desplazamientos.",
      questions: [
        {
          key: "comentarios_generales",
          label: "Escriba sus comentarios aquí",
          type: "textarea",
          required: true,
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
