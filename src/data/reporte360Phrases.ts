/**
 * Qualitative phrases for the 360° report (page 6).
 * Each competency has 3 items (_1, _2, _3) with a descriptive phrase
 * used in the "Aspectos destacados y por mejorar" section.
 */
export const REPORT_PHRASES: Record<string, string> = {
  autoconciencia_1: "Dedicar tiempo a identificar las fortalezas y oportunidades de mejora que tiene como directivo docente.",
  autoconciencia_2: "Crear y promover espacios de reflexión con los integrantes de sus equipos de trabajo para identificar cómo pueden mejorar en sus roles.",
  autoconciencia_3: "Convocar a la comunidad educativa a participar en espacios de reflexión para que puedan identificar cómo pueden mejorar desde sus diversos roles.",
  emociones_1: "Manifestar sus emociones y reconocer el impacto que tienen en cómo se relaciona con los otros integrantes de la comunidad educativa.",
  emociones_2: "Realizar reuniones con su equipo de trabajo para identificar emociones propias y ajenas como fundamento para el mejoramiento del ambiente escolar.",
  emociones_3: "Llevar a cabo estrategias para que los diferentes integrantes de la comunidad educativa puedan expresar de manera asertiva sus emociones.",
  comunicacion_1: "Reconocer que tiene fortalezas y oportunidades de mejora para comunicarse de manera asertiva.",
  comunicacion_2: "Usar con sus equipos de trabajo herramientas para comunicarse asertivamente desde un enfoque apreciativo.",
  comunicacion_3: "Comunicarse con la comunidad educativa utilizando herramientas de comunicación asertiva y desde un enfoque apreciativo.",
  colaborativo_1: "Reconocer que tiene fortalezas y oportunidades de mejora para trabajar de manera colaborativa en la IE.",
  colaborativo_2: "Implementar con sus equipos de trabajo los principios y herramientas de trabajo colaborativo.",
  colaborativo_3: "Realizar actividades con la comunidad educativa en la que se trabaja de manera colaborativa.",
  direccion_1: "Conocer la pertinencia del PEI en relación con las necesidades y potencialidades del contexto.",
  direccion_2: "Orientar a sus equipos de trabajo en relación con los planes y proyectos pedagógicos que componen el PEI.",
  direccion_3: "Convocar a la comunidad educativa para hacer seguimiento y evaluación a los procesos y metas del PEI.",
  orientacion_1: "Comprender la potencia de las prácticas pedagógicas como actos transformadores, productores de saber y movilizadores de la participación.",
  orientacion_2: "Generar espacios de reflexión pedagógica con sus equipos de trabajo para fortalecer las prácticas de los docentes.",
  orientacion_3: "Promover la corresponsabilidad de los diferentes actores de la comunidad educativa en los procesos pedagógicos de la IE.",
  convivencia_1: "Valorar las diferencias de los integrantes de la comunidad como elemento que potencia el mejoramiento del ambiente escolar.",
  convivencia_2: "Construir con sus equipos de trabajo acuerdos que reflejen la valoración de la diferencia como potencialidad.",
  convivencia_3: "Construir con los diferentes actores de la comunidad educativa los acuerdos de convivencia de la IE que reflejen la valoración de la diferencia como potencialidad.",
  evaluacion_1: "Comprender la evaluación como una herramienta de aprendizaje y mejora continua.",
  evaluacion_2: "Analizar con sus equipos de trabajo la pertinencia de los procesos de evaluación de la IE en relación con los objetivos institucionales.",
  evaluacion_3: "Generar espacios de reflexión sobre los procesos de evaluación de la IE con los diferentes integrantes de la comunidad educativa.",
  vision_1: "Comprender la importancia de construir una visión compartida con la comunidad en los procesos administrativos y pedagógicos de la IE.",
  vision_2: "Diseñar estrategias con sus equipos de trabajo para construir la visión compartida con la comunidad educativa.",
  vision_3: "Construir con los diferentes actores de la comunidad educativa la visión compartida de la IE que recoja los sueños de transformación institucional.",
  planeacion_1: "Comprender la importancia de la participación de la comunidad en los procesos de planeación institucional.",
  planeacion_2: "Diseñar con sus equipos de trabajo estrategias de planeación institucional en las que la comunidad educativa pueda participar.",
  planeacion_3: "Realizar procesos de planeación institucional con la participación de los diferentes actores de la comunidad educativa.",
  redes_1: "Reconocer que su liderazgo y el de otros directivos docentes potencian el fortalecimiento de procesos institucionales y regionales.",
  redes_2: "Identificar con sus equipos de trabajo posibilidades de intercambio con otras IE para fortalecer los aprendizajes y la convivencia.",
  redes_3: "Conformar redes para fortalecer los procesos de planeación de la IE.",
  alianzas_1: "Reconocer que en el territorio existen organizaciones, entidades y actores comunitarios que pueden aportar al logro de los objetivos de la IE mediante alianzas.",
  alianzas_2: "Identificar con sus equipos de trabajo las organizaciones, entidades y actores comunitarios con los que se pueden generar alianzas para avanzar en los sueños de transformación de la IE.",
  alianzas_3: "Establecer alianzas con organizaciones, entidades y actores comunitarios del territorio para fortalecer los procesos institucionales.",
  rendicion_1: "Comprender la rendición de cuentas como un proceso de diálogo abierto y transparente con la comunidad educativa en la que se presentan los avances y retos institucionales.",
  rendicion_2: "Diseñar con sus equipos de trabajo estrategias para realizar la rendición de cuentas garantizando que se aborden los procesos pedagógicos y los administrativos.",
  rendicion_3: "Promueve la participación de la comunidad educativa en la rendición de cuentas de los procesos pedagógicos y administrativos de la IE.",
};

/** Map form type to observer role key used in competency_weights */
export const FORM_TYPE_TO_ROLE: Record<string, string> = {
  directivo: "coor",
  docente: "doce",
  administrativo: "admi",
  acudiente: "acud",
  estudiante: "estu",
};

/** Display labels for observer roles */
export const ROLE_LABELS: Record<string, string> = {
  coor: "Par",
  doce: "Docente",
  admi: "Personal administrativo",
  acud: "Acudiente y familia",
  estu: "Estudiante",
};

/** Roles considered "internal" observers */
export const INTERNAL_ROLES = ["coor", "doce", "admi"];
/** Roles considered "external" observers */
export const EXTERNAL_ROLES = ["estu", "acud"];

/** Domain keys and labels in display order */
export const DOMAIN_ORDER = [
  { key: "personal", label: "Gestión Personal" },
  { key: "pedagogica", label: "Gestión Pedagógica" },
  { key: "administrativa", label: "Gestión Administrativa y Comunitaria" },
];

/** Competency keys grouped by domain (in display order) */
export const COMPETENCIES_BY_DOMAIN: Record<string, string[]> = {
  personal: ["autoconciencia", "emociones", "comunicacion", "colaborativo"],
  pedagogica: ["direccion", "orientacion", "convivencia", "evaluacion"],
  administrativa: ["vision", "planeacion", "redes", "alianzas", "rendicion"],
};

/** Competency display labels */
export const COMPETENCY_LABELS: Record<string, string> = {
  autoconciencia: "Autoconciencia",
  emociones: "Manejo de emociones",
  comunicacion: "Comunicación asertiva",
  colaborativo: "Trabajo colaborativo",
  direccion: "Dirección del PEI",
  orientacion: "Orientación pedagógica",
  convivencia: "Convivencia",
  evaluacion: "Fomento de la cultura de la evaluación",
  vision: "Fomento de la visión compartida",
  planeacion: "Planeación institucional",
  redes: "Construcción de redes",
  alianzas: "Generación de alianzas",
  rendicion: "Rendición de cuentas",
};

/** Domain suffix marks for radar chart labels */
export const COMPETENCY_DOMAIN_MARK: Record<string, string> = {
  autoconciencia: "*",
  emociones: "*",
  comunicacion: "*",
  colaborativo: "*",
  direccion: "**",
  orientacion: "**",
  convivencia: "**",
  evaluacion: "**",
  vision: "***",
  planeacion: "***",
  redes: "***",
  alianzas: "***",
  rendicion: "***",
};
