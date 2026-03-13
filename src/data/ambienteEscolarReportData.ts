// ── Cross-actor question mappings and static texts for Ambiente Escolar report ──

import {
  DOCENTES_LIKERT,
  ESTUDIANTES_LIKERT,
  ACUDIENTES_LIKERT,
  type LikertSection,
} from "./ambienteEscolarData";

// ── Colors for S/A/N groupings ──
export const SAN_COLORS = {
  S: [34, 139, 34] as [number, number, number],   // green
  A: [65, 105, 225] as [number, number, number],   // blue
  N: [220, 53, 69] as [number, number, number],    // red
};

export const SAN_LABELS = {
  S: "Siempre / Casi siempre",
  A: "A veces",
  N: "Casi nunca / Nunca",
};

// ── Section names ──
export const SECTION_NAMES = ["Comunicación", "Prácticas Pedagógicas", "Convivencia"] as const;
export type SectionName = typeof SECTION_NAMES[number];

// ── Likert by role ──
export const LIKERT_BY_ROLE: Record<string, LikertSection[]> = {
  docentes: DOCENTES_LIKERT,
  estudiantes: ESTUDIANTES_LIKERT,
  acudientes: ACUDIENTES_LIKERT,
};

// ── Unified report items ──
// Each entry maps items across the 3 roles for the unified Fortalezas y Retos table.
// The `reportText` is the neutral/docente-perspective text shown in the table.
export interface UnifiedReportItem {
  reportText: string;
  section: SectionName;
  docentes?: string;    // item id in DOCENTES_LIKERT
  estudiantes?: string; // item id in ESTUDIANTES_LIKERT
  acudientes?: string;  // item id in ACUDIENTES_LIKERT
}

export const UNIFIED_REPORT_ITEMS: UnifiedReportItem[] = [
  // ── Comunicación ──
  {
    reportText: "Los docentes tienen la disposición de dialogar con las familias sobre los aprendizajes de los estudiantes en momentos adicionales a la entrega de notas.",
    section: "Comunicación",
    docentes: "com_1", estudiantes: "com_1", acudientes: "com_1",
  },
  {
    reportText: "Los docentes promueven el apoyo de las familias a los estudiantes por medio de actividades para hacer en casa.",
    section: "Comunicación",
    docentes: "com_2", estudiantes: "com_5", acudientes: "com_2",
  },
  {
    reportText: "En la Institución Educativa se promueve la participación de docentes, familias y estudiantes en la toma de decisiones sobre las metas institucionales.",
    section: "Comunicación",
    docentes: "com_3", estudiantes: "com_6", acudientes: "com_3",
  },
  {
    reportText: "En la Institución Educativa se hace reconocimiento público de las prácticas pedagógicas innovadoras de los docentes.",
    section: "Comunicación",
    docentes: "com_4", estudiantes: "com_2", acudientes: "com_4",
  },
  {
    reportText: "Los directivos docentes y los diferentes actores de la comunidad se comunican de manera asertiva.",
    section: "Comunicación",
    docentes: "com_5", estudiantes: "com_3", acudientes: "com_5",
  },
  {
    reportText: "Los docentes de la Institución Educativa se comunican de manera asertiva.",
    section: "Comunicación",
    docentes: "com_6", estudiantes: "com_4", acudientes: "com_6",
  },
  // ── Prácticas Pedagógicas ──
  {
    reportText: "Los intereses y las necesidades de los estudiantes son tenidos en cuenta en la planeación de las clases.",
    section: "Prácticas Pedagógicas",
    docentes: "ped_2", estudiantes: "ped_2", acudientes: "ped_3",
  },
  {
    reportText: "Los docentes de la Institución Educativa participan en proyectos transversales con otros colegas.",
    section: "Prácticas Pedagógicas",
    docentes: "ped_3", estudiantes: "ped_3", acudientes: undefined,
  },
  {
    reportText: "Para el desarrollo de los planes de aula, los docentes utilizan espacios alternativos como bibliotecas, parques, laboratorios, museos, etc.",
    section: "Prácticas Pedagógicas",
    docentes: "ped_1", estudiantes: "ped_1", acudientes: "ped_1",
  },
  {
    reportText: "Los docentes logran cumplir los objetivos y el desarrollo de las clases que tenían planeados.",
    section: "Prácticas Pedagógicas",
    docentes: "ped_4", estudiantes: "ped_7", acudientes: undefined,
  },
  {
    reportText: "Los docentes demuestran que confían en los estudiantes y que creen en sus capacidades y habilidades.",
    section: "Prácticas Pedagógicas",
    docentes: "ped_8", estudiantes: "ped_8", acudientes: "ped_2",
  },
  {
    reportText: "Los docentes adaptan su enseñanza para que todas y todos aprendan independiente de su entorno social, afectivo y sus capacidades.",
    section: "Prácticas Pedagógicas",
    docentes: "ped_5", estudiantes: "ped_4", acudientes: "ped_4",
  },
  {
    reportText: "Al evaluar, los docentes tienen en cuenta las emociones, en conjunto con el aprendizaje y el comportamiento.",
    section: "Prácticas Pedagógicas",
    docentes: "ped_6", estudiantes: "ped_5", acudientes: "ped_5",
  },
  {
    reportText: "La Institución Educativa organiza o participa en actividades deportivas, culturales o académicas con otros colegios.",
    section: "Prácticas Pedagógicas",
    docentes: "ped_7", estudiantes: "ped_6", acudientes: "ped_6",
  },
  // ── Convivencia ──
  {
    reportText: "Todos los estudiantes son tratados con respeto independiente de sus creencias religiosas, género, orientación sexual, grupo étnico y capacidades.",
    section: "Convivencia",
    docentes: "conv_5", estudiantes: "conv_5", acudientes: "conv_6",
  },
  {
    reportText: "Docentes y estudiantes establecen acuerdos de convivencia al comenzar el año escolar.",
    section: "Convivencia",
    docentes: "conv_3", estudiantes: "conv_3", acudientes: "conv_4",
  },
  {
    reportText: "Las opiniones y propuestas de familias, estudiantes y docentes son tenidas en cuenta cuando se construyen acuerdos de convivencia.",
    section: "Convivencia",
    docentes: "conv_4", estudiantes: "conv_4", acudientes: "conv_5",
  },
  {
    reportText: "Los docentes son tratados con respeto por los estudiantes.",
    section: "Convivencia",
    docentes: "conv_1", estudiantes: "conv_1", acudientes: "conv_1",
  },
  {
    reportText: "Cada miembro de la comunidad educativa se siente escuchado y comprendido por los demás.",
    section: "Convivencia",
    docentes: "conv_7", estudiantes: "conv_6", acudientes: undefined,
  },
  {
    reportText: "En la Institución Educativa, las personas se sienten apoyadas para resolver los conflictos que se dan y se generan aprendizajes a partir de estos.",
    section: "Convivencia",
    docentes: "conv_6", estudiantes: "conv_7", acudientes: "conv_2",
  },
];

// Keep old CROSS_ACTOR_ITEMS for backward compat if needed
export const CROSS_ACTOR_ITEMS = UNIFIED_REPORT_ITEMS;
export type CrossActorItem = UnifiedReportItem;

// ── Explanatory texts for pages 2-3 (full 2-page version matching old PDF) ──
export const REPORT_INTRO_TEXT = `La Encuesta de Ambiente escolar tiene el objetivo de dar a conocer al directivo docente la percepción que los actores de la comunidad tienen sobre el ambiente escolar en la Institución Educativa para que pueda identificar los ejes de acción para emprender las transformaciones en la IE. La encuesta recoge la percepción de un grupo de estudiantes, docentes y acudientes para tener información de primera mano sobre los aspectos que tienen relación con el ambiente escolar.

Para el Programa RLT y CLT el concepto de ambiente escolar se refiere a las dinámicas e interrelaciones que derivan de los procesos comunicativos, pedagógicos y convivenciales en la institución educativa. El ambiente escolar se reconoce como una de las variables que tiene mayor influencia en los aprendizajes en la escuela. En este sentido, es importante identificar los aspectos que desafían el liderazgo del directivo docente que participa en el Programa RLT y CLT.

La Encuesta de ambiente escolar indaga por tres componentes: comunicación; prácticas pedagógicas; y convivencia. La comunicación se entiende como la capacidad de expresar las necesidades, intereses, posiciones, derechos e ideas propias de maneras claras y enfáticas (Programa Rectores Líderes Transformadores, 2017a) (1). La comunicación institucional fluida, con reglas claras y explícitas, facilita la interacción efectiva entre los docentes, los directivos, los estudiantes, las familias y otros miembros de la comunidad educativa. También facilita el trabajo en equipo, la resolución de problemas y conflictos, la construcción de metas comunes y el compromiso por los resultados. Implica construir relaciones basadas en el respeto por uno mismo y por los demás, usar un lenguaje que tenga un impacto más positivo en el otro, sin agredir.

En relación con el ambiente escolar, la comunicación permite crear canales y mecanismos para promover la participación y la corresponsabilidad de los diferentes actores con los procesos de aprendizaje, lo que genera confianza y compromiso. Así mismo, permite reconocer y dar a conocer las innovaciones de las y los docentes para mejorar los aprendizajes, lo que genera redes de aprendizaje, impacta el clima laboral y la relación de estudiantes y familias con los docentes.

Las prácticas pedagógicas son el conjunto de acciones que las y los docentes emprender para que las y los estudiantes desarrollen sus competencias y mejores sus aprendizajes y no se limitan al aula de clase. En relación con el ambiente escolar, las prácticas pedagógicas impactan las emociones y creencias sobre la didáctica, la evaluación y la pertinencia de los procesos formativos que se dan en la institución educativa. El uso de espacios diferentes al aula de clase, la construcción de proyectos interdisciplinarios y la apertura a espacios de interacción con otras instituciones, facilitan y enriquecen los saberes de docentes y estudiantes pues los invita a comprender que tienen un lugar orgánico dentro de la comunidad desde su rol en la Institución Educativa, lo cual crea sentido de pertenencia y evidencia el poder transformador de la pedagogía.

De la misma manera, tener altas expectativas de las niñas, niños y jóvenes, tener en cuenta sus necesidades e intereses para la construcción de los planes de aula, y tener en cuenta su dimensión afectiva y emocional cuando son evaluados, impacta las relaciones entre docentes, familias y estudiantes, lo cual deriva en relaciones más respetuosas y solidarias en la institución.

(1) Programa Rectores Líderes Transformadores (2017a). Cartilla del módulo 1: Gestión personal. Bogotá: Fundación Empresarios por la Educación.`;

export const REPORT_INTRO_TEXT_PAGE3 = `La convivencia se entiende con el conjunto de relaciones que se construyen por el afecto, las emociones, los deseos y los sueños de quienes componen una comunidad. En ellas se promueven y vivencian los derechos humanos, la igualdad en el trato, el reconocimiento y el respeto por las diferencias para la construcción del tejido social. La convivencia escolar es un aprendizaje permanente que orienta a los sujetos a "aprender a vivir juntos" y pasa por el deber que tiene la institución educativa de garantizar el respeto a los derechos humanos. Comprendiendo la condición humana diversa, este aprendizaje pasa por asumir la diferencia como posibilidad de aprendizaje entre pares y el conflicto como una constante en las relaciones humanas que están en la base de la construcción de ciudadanía. La autonomía y la ética del cuidado son elementos formativos fundamentales para la convivencia escolar (Rectores Líderes Transformadores, 2017b) (2).

En relación con el ambiente escolar, el trato respetuoso y solidario con las otras y los otros, la construcción de acuerdos colectivos para convivir, la comprensión de la diferencia como potencia y no como déficit, el sentirse escuchado y comprendido y el tener herramientas disponibles para actuar frente a los conflictos impacta la manera como interactuamos a diario y la comprensión que tenemos sobre el mundo.

Conocer la percepción sobre el ambiente escolar le permite al directivo evidenciar los aspectos que su comunidad educativa resalta como fortalezas y como oportunidades de mejora desde su vivencia en el aula de clase y como producto de sus interacciones. Esta información de "primera mano" es muy valiosa para el directivo pues puede, de manera articulada con las actividades propuestas por el Programa, emprender acciones oportunas para superar dificultades que se presentan en la IE. Esta información debe ser compartida con la comunidad educativa y con ellos analizar estos resultados para poder identificar acciones o un plan de acción para superar los retos identificados. De esta manera, se asegura que quien participa en la encuesta pueda conocer los resultados y emprender procesos de corresponsabilidad.

Estos resultados son una herramienta para identificar retos y oportunidades de mejora en el ambiente escolar de la institución educativa que lidera y no constituyen una medición directa sobre el ambiente escolar. Es decir, los resultados presentados muestran la percepción de un grupo no representativo de actores indicando los aspectos que este grupo resalta en relación a las prácticas pedagógicas, la convivencia y la comunicación.

El informe se divide en tres partes. En la primera se encuentra la información general del directivo y de las personas encuestadas. La segunda es un resumen general de la percepción del ambiente que tiene cada uno de los grupos de actores en los tres componentes evaluados (comunicación, prácticas pedagógicas y convivencia). Al final está un resumen de las respuestas de cada uno de los ítems de la encuesta y un espacio para que el directivo escriba los retos que este informe le plantea.

(2) Programa Rectores Líderes Transformadores (2017b). Cartilla del módulo 2: Gestión pedagógica. Bogotá: Fundación Empresarios por la Educación.`;

// Keep old constants for backward compatibility
export const COMPONENTE_COMUNICACION = `Se refiere a los procesos de comunicación institucional entre directivos, docentes, estudiantes y acudientes. Incluye la disposición al diálogo, la claridad y el respeto en las interacciones, el reconocimiento de prácticas exitosas, y la promoción de la participación de todos los actores en la toma de decisiones institucionales.`;

export const COMPONENTE_PRACTICAS = `Comprende las acciones pedagógicas que desarrollan los docentes, incluyendo el uso de diversos espacios de aprendizaje, la consideración de los intereses de los estudiantes, el trabajo colaborativo entre docentes, el enfoque diferencial e inclusivo, la evaluación integral, y las actividades interinstitucionales.`;

export const COMPONENTE_CONVIVENCIA = `Abarca las relaciones de convivencia en la comunidad educativa, incluyendo el respeto mutuo entre los actores, la solidaridad y aceptación de la diversidad, la construcción participativa de acuerdos de convivencia, el apoyo en la resolución de conflictos, y la sensación de sentirse escuchado y comprendido.`;

export const REPORT_STRUCTURE_TEXT = `El informe se divide en cuatro apartados. El primero presenta el número de encuestados por tipo de actor y sus características demográficas. El segundo es un resumen general donde se muestra, de manera agregada, la distribución porcentual de las respuestas en las tres componentes para cada tipo de actor. El tercero presenta el detalle ítem por ítem con la comparación entre los tres actores, identificando las fortalezas (ítems con alta frecuencia de "Siempre/Casi siempre") y los retos (ítems con baja frecuencia). Finalmente, se incluye un espacio para que el directivo registre los retos identificados.`;

// ── Help box texts (matching old PDF) ──
export const HELP_BOX_ENCUESTADOS = "Analice la composición de los distintos grupos encuestados y tenga encuenta que esta muestra no representa la totalidad de su IE.";

export const HELP_BOX_RESUMEN = "Lo ideal sería que, en los tres componentes, la percepción de cada uno de los actores fuera lo más positiva posible. Identifique en cuáles actores y componentes la percepción negativa es mayor.";

export const HELP_BOX_FORTALEZAS = "Los elementos en naranja representan elementos a mejorar.";

export const HELP_BOX_RETOS = "En el recuadro escriba los retos que estos resultados le plantean como líder.";

// ── Helper: get specific question text for an item ID within a role ──
export function getQuestionText(role: string, itemId: string): string {
  const sections = LIKERT_BY_ROLE[role];
  if (!sections) return "";
  for (const sec of sections) {
    const item = sec.items.find((i) => i.id === itemId);
    if (item) return item.text;
  }
  return "";
}
