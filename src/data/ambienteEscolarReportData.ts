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

// ── Cross-actor question mappings ──
// Each entry maps a neutral report item to the specific question IDs per role
// The IDs correspond to the `id` fields in ambienteEscolarData.ts
export interface CrossActorItem {
  neutralText: string;
  section: SectionName;
  docentes?: string;    // item id in DOCENTES_LIKERT
  estudiantes?: string; // item id in ESTUDIANTES_LIKERT
  acudientes?: string;  // item id in ACUDIENTES_LIKERT
}

export const CROSS_ACTOR_ITEMS: CrossActorItem[] = [
  // ── Comunicación ──
  {
    neutralText: "Disposición para hablar con acudientes sobre aprendizajes",
    section: "Comunicación",
    docentes: "com_1", estudiantes: "com_1", acudientes: "com_1",
  },
  {
    neutralText: "Promover apoyo de acudientes al aprendizaje",
    section: "Comunicación",
    docentes: "com_2", estudiantes: "com_5", acudientes: "com_2",
  },
  {
    neutralText: "Participación en toma de decisiones institucionales",
    section: "Comunicación",
    docentes: "com_3", estudiantes: "com_6", acudientes: "com_3",
  },
  {
    neutralText: "Reconocimiento público de prácticas pedagógicas exitosas",
    section: "Comunicación",
    docentes: "com_4", estudiantes: "com_2", acudientes: "com_4",
  },
  {
    neutralText: "Comunicación respetuosa y clara con directivos",
    section: "Comunicación",
    docentes: "com_5", estudiantes: "com_3", acudientes: "com_5",
  },
  {
    neutralText: "Sentirse escuchado/a y comprendido/a en el colegio",
    section: "Comunicación",
    docentes: "com_6", estudiantes: undefined, acudientes: "com_6",
  },
  // ── Prácticas Pedagógicas ──
  {
    neutralText: "Uso de espacios diferentes al salón para las clases",
    section: "Prácticas Pedagógicas",
    docentes: "ped_1", estudiantes: "ped_1", acudientes: "ped_1",
  },
  {
    neutralText: "Considerar intereses y necesidades de estudiantes",
    section: "Prácticas Pedagógicas",
    docentes: "ped_2", estudiantes: "ped_2", acudientes: "ped_3",
  },
  {
    neutralText: "Articulación entre docentes para proyectos pedagógicos",
    section: "Prácticas Pedagógicas",
    docentes: "ped_3", estudiantes: "ped_3", acudientes: undefined,
  },
  {
    neutralText: "Clases con enfoque diferencial e inclusivo",
    section: "Prácticas Pedagógicas",
    docentes: "ped_5", estudiantes: "ped_4", acudientes: "ped_4",
  },
  {
    neutralText: "Evaluación con dimensión afectiva y emocional",
    section: "Prácticas Pedagógicas",
    docentes: "ped_6", estudiantes: "ped_5", acudientes: "ped_5",
  },
  {
    neutralText: "Actividades interinstitucionales (torneos, ferias, olimpiadas)",
    section: "Prácticas Pedagógicas",
    docentes: "ped_7", estudiantes: "ped_6", acudientes: "ped_6",
  },
  {
    neutralText: "Confianza en las capacidades de los estudiantes",
    section: "Prácticas Pedagógicas",
    docentes: "ped_8", estudiantes: "ped_8", acudientes: "ped_2",
  },
  // ── Convivencia ──
  {
    neutralText: "Estudiantes tratan con respeto a docentes y directivos",
    section: "Convivencia",
    docentes: "conv_1", estudiantes: "conv_1", acudientes: "conv_1",
  },
  {
    neutralText: "Respeto y solidaridad entre estudiantes (diversidad)",
    section: "Convivencia",
    docentes: "conv_2", estudiantes: "conv_2", acudientes: "conv_3",
  },
  {
    neutralText: "Acuerdos de convivencia al comenzar el año",
    section: "Convivencia",
    docentes: "conv_3", estudiantes: "conv_3", acudientes: "conv_4",
  },
  {
    neutralText: "Opiniones tenidas en cuenta para acuerdos de convivencia",
    section: "Convivencia",
    docentes: "conv_4", estudiantes: "conv_4", acudientes: "conv_5",
  },
  {
    neutralText: "Trato respetuoso sin importar diferencias",
    section: "Convivencia",
    docentes: "conv_5", estudiantes: "conv_5", acudientes: "conv_6",
  },
  {
    neutralText: "Apoyo para resolver conflictos",
    section: "Convivencia",
    docentes: "conv_6", estudiantes: "conv_7", acudientes: "conv_2",
  },
  {
    neutralText: "Sentirse escuchado/a en el colegio (convivencia)",
    section: "Convivencia",
    docentes: "conv_7", estudiantes: "conv_6", acudientes: undefined,
  },
];

// ── Explanatory texts for pages 2-3 ──
export const REPORT_INTRO_TEXT = `Con el propósito de brindar insumos valiosos a los directivos docentes sobre su Institución Educativa y apoyar la identificación de retos y oportunidades de mejora, el Programa Rectores Líderes Transformadores y Coordinadores Líderes Transformadores ha diseñado la "Encuesta de Ambiente Escolar", centrada en tres aspectos clave: la comunicación, la convivencia y las prácticas pedagógicas.

Las respuestas de los participantes son fundamentales para generar información que permita a rectores y coordinadores fortalecer su gestión institucional y avanzar en procesos de transformación, sustentados en la toma de decisiones basada en datos.

La información recolectada será tratada de manera confidencial y utilizada exclusivamente con fines estadísticos y de mejoramiento continuo.`;

export const COMPONENTE_COMUNICACION = `Se refiere a los procesos de comunicación institucional entre directivos, docentes, estudiantes y acudientes. Incluye la disposición al diálogo, la claridad y el respeto en las interacciones, el reconocimiento de prácticas exitosas, y la promoción de la participación de todos los actores en la toma de decisiones institucionales.`;

export const COMPONENTE_PRACTICAS = `Comprende las acciones pedagógicas que desarrollan los docentes, incluyendo el uso de diversos espacios de aprendizaje, la consideración de los intereses de los estudiantes, el trabajo colaborativo entre docentes, el enfoque diferencial e inclusivo, la evaluación integral, y las actividades interinstitucionales.`;

export const COMPONENTE_CONVIVENCIA = `Abarca las relaciones de convivencia en la comunidad educativa, incluyendo el respeto mutuo entre los actores, la solidaridad y aceptación de la diversidad, la construcción participativa de acuerdos de convivencia, el apoyo en la resolución de conflictos, y la sensación de sentirse escuchado y comprendido.`;

export const REPORT_STRUCTURE_TEXT = `El informe se divide en cuatro apartados. El primero presenta el número de encuestados por tipo de actor y sus características demográficas. El segundo es un resumen general donde se muestra, de manera agregada, la distribución porcentual de las respuestas en las tres componentes para cada tipo de actor. El tercero presenta el detalle ítem por ítem con la comparación entre los tres actores, identificando las fortalezas (ítems con alta frecuencia de "Siempre/Casi siempre") y los retos (ítems con baja frecuencia). Finalmente, se incluye un espacio para que el directivo registre los retos identificados.`;

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
