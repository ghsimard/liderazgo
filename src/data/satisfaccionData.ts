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

// ═══════════════════════════════════════════════════════════
// ASISTENCIA
// ═══════════════════════════════════════════════════════════
export const asistenciaForm: SatisfaccionFormDef = {
  formType: "asistencia",
  title: "Registro de asistencia - RLT",
  description: "En el marco del Programa Rectores Líderes Transformadores queremos llevar un control organizado de la asistencia a los eventos programados.\n\nEste formulario tiene como único propósito registrar su participación en dichas actividades. La información que usted proporcione será confidencial y se utilizará únicamente para fines administrativos.\n\nAgradecemos su compromiso y participación activa.",
  sections: [
    {
      title: "Información de la sesión",
      questions: [
        {
          key: "fecha_registro",
          label: "Selecciona la fecha en la que estás diligenciando este formulario",
          type: "date",
          required: true,
        },
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
  description: "Para RLT es muy importante conocer su valiosa opinión sobre las actividades y los logros alcanzados durante el desarrollo de los interludios. Así mismo un insumo para el mejoramiento su visión sobre los facilitadores y coaches que le acompañan en este proceso de formación.\n\nPor favor lea muy cuidadosamente cada uno de los enunciados que se presentan a continuación y señale la respuesta que, en cada caso, refleje su percepción. Agradecemos sus comentarios al final de la encuesta.\n\nLa información recopilada por medio de esta encuesta es anónima y confidencial y solo será utilizada con fines estadísticos y para emprender acciones de mejoramiento a futuro.",
  sections: [
    {
      title: "Actividades más valiosas",
      description: "De la siguiente lista señale las tres (3) actividades que más le aportaron en su formación como líder transformador.",
      questions: [
        {
          key: "top3_actividades",
          label: "Seleccione máximo 3 actividades",
          type: "checkbox-max3",
          maxSelect: 3,
          required: true,
          options: [
            { value: "socializacion_rlt_clt", label: "Socialización del Programa RLT y CLT" },
            { value: "trabajo_colaborativo_ie", label: "Trabajo colaborativo en la Institución Educativa" },
            { value: "valor_ser_reloj", label: "El valor de ser y de ser con otros (El reloj)" },
            { value: "conversaciones_transformadoras", label: "Conversaciones transformadoras" },
            { value: "buzon_afecto", label: "Buzón del afecto" },
            { value: "intercambio_pares", label: "Intercambio entre pares" },
            { value: "sesion_coaching_grupal", label: "Sesión de coaching grupal" },
          ],
        },
      ],
    },
    {
      title: "Desarrollo del interludio",
      description: "Por favor señale con una X la opción que considere más apropiada en cada una de las siguientes preguntas.",
      questions: [
        {
          key: "desarrollo",
          label: "",
          type: "grid-sino",
          rows: [
            { key: "desarrollo_tematicas", label: "¿Las temáticas y actividades en el interludio aportaron para fortalecer su liderazgo en la institución educativa?" },
            { key: "desarrollo_participacion", label: "¿Las actividades programadas para el interludio promovieron la participación de los diferentes actores de la comunidad educativa?" },
            { key: "desarrollo_concordancia", label: "¿Las actividades y temáticas propuestas para el interludio tienen concordancia con lo desarrollado en el intensivo?" },
            { key: "desarrollo_metodologia", label: "¿Fue efectiva la metodología utilizada para el acompañamiento durante el interludio?" },
            { key: "desarrollo_documentos", label: "¿Los documentos y guías aportados por el equipo local fueron útiles para el desarrollo de las actividades propuestas para el interludio?" },
          ],
          columns: SINO_PARCIAL,
          required: true,
        },
      ],
    },
    {
      title: "Facilitador pedagógico",
      description: "Por favor señale con una X la opción que considere más apropiada en cuanto a la frecuencia en que se dieron las siguientes situaciones con su facilitador pedagógico.",
      questions: [
        {
          key: "facilitador_pedagogico",
          label: "",
          type: "grid-frequency",
          rows: [
            { key: "fac_duracion", label: "La duración de su acompañamiento me resultó suficiente para desarrollar los objetivos previstos." },
            { key: "fac_participacion", label: "Me apoyó para promover la participación de los diferentes actores de la comunidad educativa en el acompañamiento situado." },
            { key: "fac_orientaciones", label: "Me fueron muy útiles las orientaciones ofrecidas para desarrollar las actividades del acompañamiento situado." },
            { key: "fac_dominio", label: "Demostró dominio de las temáticas propuestas para el acompañamiento situado." },
          ],
          columns: FREQUENCY4,
          required: true,
        },
      ],
    },
    {
      title: "Coach",
      description: "Por favor señale con una X la opción que considere más apropiada en cuanto a la frecuencia en que se dieron las siguientes situaciones con su coach.",
      questions: [
        {
          key: "coach",
          label: "",
          type: "grid-frequency",
          rows: [
            { key: "coach_duracion", label: "La duración de la sesión de coaching fue suficiente para lograr los objetivos previstos." },
            { key: "coach_transformacion", label: "La sesión de coaching me permitió identificar acciones a implementar para mi transformación personal." },
            { key: "coach_gestion", label: "La sesión de coaching me permitió fortalecer mi gestión como líder de la institución educativa." },
          ],
          columns: FREQUENCY4,
          required: true,
        },
      ],
    },
    {
      title: "Autoevaluación",
      description: "Por favor señale con una X la opción que considere más apropiada en cuanto a la frecuencia en que se dieron las siguientes situaciones en el interludio.",
      questions: [
        {
          key: "autoevaluacion",
          label: "",
          type: "grid-frequency",
          rows: [
            { key: "auto_colaboracion", label: "Trabajé colaborativamente con mi equipo institucional en las actividades del interludio." },
            { key: "auto_guias", label: "Me apoyé en las guías entregadas para llevar a cabo las actividades programadas en el interludio." },
            { key: "auto_aprendizajes", label: "Puse en práctica los aprendizajes del intensivo." },
            { key: "auto_participacion", label: "Promoví la participación de diferentes actores de la comunidad educativa en las actividades." },
          ],
          columns: FREQUENCY4,
          required: true,
        },
      ],
    },
    {
      title: "Oportunidades de mejora",
      questions: [
        {
          key: "oportunidades_mejora",
          label: "Por favor, registre a continuación las oportunidades de mejora que usted tiene o que el equipo local tiene frente al interludio.",
          type: "textarea",
          required: true,
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
      description: "A continuación encontrarás cuatro temas. Si considera que alguno de estos tiene oportunidades de mejora, por favor escribe el número del tema antes de tu comentario. Si no tienes observaciones sobre algún tema, puedes omitirlo.<br/><br/><b>Temas:</b><br/><br/>1. Desarrollo del intensivo<br/>2. Desempeño del equipo local facilitador(es) y coach(es)<br/>3. Organización logística<br/>4. Tu propia participación<br/><br/><b>Ejemplo:</b><br/>1. Podrían haber incluido más actividades prácticas.<br/>2. Sugiero mejorar la gestión de los tiempos en los desplazamientos.",
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
