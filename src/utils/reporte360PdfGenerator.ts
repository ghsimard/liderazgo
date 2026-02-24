import jsPDF from "jspdf";
import type { Reporte360Data } from "./reporte360Calculator";
import {
  DOMAIN_ORDER,
  COMPETENCIES_BY_DOMAIN,
  COMPETENCY_LABELS,
  COMPETENCY_DOMAIN_MARK,
} from "@/data/reporte360Phrases";

// ── Image loader ──
function loadImageAsBase64(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

// ── Color constants (grayscale for black-ink-only printing) ──
const COLOR_DIRECTIVO: [number, number, number] = [0, 100, 180];       // strong blue
const COLOR_INTERNOS: [number, number, number] = [120, 120, 120];     // medium gray
const COLOR_EXTERNOS: [number, number, number] = [190, 190, 190];     // light gray
const COLOR_OBSERVER: [number, number, number] = [220, 60, 60];       // red
const COLOR_HEADER_BG: [number, number, number] = [60, 60, 60];       // dark header
const _COLOR_LIGHT_BG: [number, number, number] = [230, 230, 230];

// ── Helper: round to 1 decimal ──
function r1(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

// ── Introduction text (pages 2-3) ──
const INTRO_TEXT = `La Encuesta de 360° ponderada tiene como objetivo brindar al directivo docente información comparada de su perspectiva y la de las personas que lo rodean en la Institución Educativa sobre las competencias y desempeños en los que se destaca y en los que tiene oportunidad de mejora en sus diferentes gestiones como líder transformador. La Encuesta tiene en cuenta qué tanto saben los diferentes actores sobre la gestión del directivo docente para determinar el peso que se da a sus respuestas, por esto es ponderada. Así mismo, recoge la percepción que docentes, estudiantes, administrativos, directivos docentes y acudientes (denominados "observadores" en este informe) tienen sobre la gestión del directivo docente que participa en el Programa RLT y CLT frente a su autopercepción.

Los resultados presentados en este informe son una herramienta de aprendizaje que no busca calificar el desempeño, sino buscan analizar la percepción de los observadores acerca de la gestión del directivo docente. El objetivo es que el participante del Programa haga una revisión crítica y reflexiva con el equipo que acompaña su proceso (facilitadores y coach) identificando fortalezas y oportunidades de mejora para plantear estrategias y acuerdos que fortalezcan sus competencias como Líder Transformador. Además, se propone que estos resultados sean socializados con quienes participaron en la encuesta.

Para poder analizar estos resultados, es necesario comprender a qué se refiere cada una de las gestiones y competencias a las que apuntan las preguntas de la Encuesta de 360° ponderada, y que integran la apuesta formativa del Programa RLT y CLT. A continuación, se presenta una descripción de cada gestión y las competencias que agrupa:`;

const GESTION_PERSONAL_TEXT = `Se refiere a las acciones que el directivo docente realiza para que su desarrollo personal mejore su rol como líder transformador de la institución educativa que lidera. En esta gestión comprende que tener una mayor conciencia de sus aspectos cognitivos, emocionales y comunicativos favorece el trabajo con otros y la construcción de una visión compartida con la comunidad educativa de la cual hace parte. Está compuesta por las siguientes competencias:`;

const COMP_PERSONAL = [
  "Autoconciencia: Actúa en coherencia con su propósito de vida en el ejercicio de su rol como directivo docente.",
  "Manejo de las emociones: Se relaciona a partir del reconocimiento y trámite de las emociones propias y de otros para construir ambientes que favorecen el aprendizaje.",
  "Comunicación asertiva: Se comunica asertivamente con los actores de la comunidad para promover relaciones basadas en el respeto y en el reconocimiento del otro.",
  "Trabajo colaborativo: Trabaja colaborativamente para mejorar las relaciones interpersonales y alcanzar de manera efectiva los objetivos institucionales.",
];

const GESTION_PEDAGOGICA_TEXT = `Acciones que el directivo docente hace para ser un líder pedagógico que guíe a su equipo de trabajo y promueva prácticas equitativas que garanticen el respeto de los derechos humanos de los estudiantes y de toda la comunidad educativa. En esta gestión la educación se entiende como un derecho en el que las metodologías, enfoques y modelos pedagógicos valoran la diferencia como potenciadora de aprendizajes. Está compuesta por las siguientes competencias:`;

const COMP_PEDAGOGICA = [
  "Dirección del PEI: Genera procesos permanentes de participación en el desarrollo del PEI para que dé respuesta a las necesidades de la comunidad educativa.",
  "Orientación pedagógica: Genera espacios de construcción colectiva del saber pedagógico para mejorar los aprendizajes de los estudiantes.",
  "Convivencia: Genera condiciones para la implementación de acuerdos de convivencia que reflejan la valoración de la diferencia como potencialidad.",
  "Fomento de la cultura de la evaluación: Promueve el enfoque de evaluación formativa en la IE para transformar las prácticas pedagógicas y mejorar los aprendizajes.",
];

const GESTION_ADMIN_TEXT = `Acciones que el directivo docente lidera para hacer de la planeación un proceso participativo en el que confluyen los sueños y expectativas de los diferentes actores de la comunidad educativa. En esta gestión, promueve la construcción de redes y alianzas con organizaciones externas a la institución educativa con el fin de unir esfuerzos para lograr metas y sueños compartidos. Está compuesta por las siguientes competencias:`;

const COMP_ADMIN = [
  "Fomento de la visión compartida: Propicia espacios para la construcción colectiva de la visión de la IE para potenciar los procesos pedagógicos y administrativos hacia la transformación institucional.",
  "Planeación institucional: Realiza de manera participativa los procesos de planeación para el mejoramiento institucional.",
  "Construcción de redes: Conforma redes de aprendizaje para mejorar su gestión, los procesos institucionales e incidir en la política pública educativa.",
  "Generación de alianzas: Establece alianzas para contribuir a la construcción del tejido social y potenciar el proceso de transformación institucional.",
  "Rendición de cuentas: Promueve la rendición de cuentas como un proceso de aprendizaje participativo, transparente y continuo para fortalecer la cultura de evaluación institucional.",
];

const INFORME_STRUCTURE = `El informe se divide en seis apartados. El primero contiene información básica del directivo y el segundo reporta la cantidad de personas encuestadas y la frecuencia con la que interactuaron con el participante del Programa la semana anterior a la encuesta. El tercero es un resumen general donde se presenta (en una escala de 0 a 10) el promedio de la percepción del directivo y la de los distintos grupos de observadores en cada una de las gestiones. Luego, se muestran las distancias por competencias entre la autopercepción y la de los observadores. El quinto apartado busca analizar las diferencias que existen entre los miembros del equipo del directivo y los estudiantes y acudientes y, finalmente, se presenta un cuadro donde se identifican las fortalezas y los aspectos a mejorar.

Nota: si alguna de las barras o promedios está en cero es porque uno o más de los encuestados decidió no responder esa pregunta.`;

// ══════════════════════════════════════════════════════════════
// MAIN PDF GENERATOR
// ══════════════════════════════════════════════════════════════

export async function generarReporte360PDF(
  data: Reporte360Data,
  logoSources: { logoRLT: string; logoCLT: string },
  options: { returnBlob?: boolean } = {}
): Promise<Blob | void> {
  const [rltB64, cltB64, bulbB64, cosmoB64] = await Promise.all([
    loadImageAsBase64(logoSources.logoRLT),
    loadImageAsBase64(logoSources.logoCLT),
    loadImageAsBase64("/images/lightbulb-icon.png"),
    loadImageAsBase64((await import("@/assets/logo_cosmo.png")).default),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const marginBottom = 15;
  const contentW = pageW - margin * 2;

  // ── Page header (repeated on each page) ──
  const drawPageHeader = () => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Programa RLT y CLT", margin, 10);
    doc.text("Informe Encuesta de 360° Ponderada", pageW - margin, 10, { align: "right" });
  };

  // ════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ════════════════════════════════════════════════════════════
  drawPageHeader();

  // Logos
  const logoW = 30;
  const logoH = 22;
  doc.addImage(rltB64, "PNG", margin, 15, logoW, logoH);
  doc.addImage(cltB64, "PNG", pageW - margin - logoW, 15, logoW, logoH);

  // Title block
  let y = 55;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PROGRAMA", pageW / 2, y, { align: "center" });
  y += 8;
  doc.text("RECTORES LÍDERES TRANSFORMADORES", pageW / 2, y, { align: "center" });
  y += 8;
  doc.text("COORDINADORES LÍDERES TRANSFORMADORES", pageW / 2, y, { align: "center" });

  // Central decorative area
  y += 20;
  doc.setFillColor(230, 230, 230);
  doc.roundedRect(margin + 20, y, contentW - 40, 80, 5, 5, "F");
  doc.setFontSize(28);
  doc.setTextColor(60, 60, 60);
  doc.text("Encuesta de", pageW / 2, y + 30, { align: "center" });
  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  doc.text("360°", pageW / 2, y + 48, { align: "center" });
  doc.setFontSize(28);
  doc.text("ponderada", pageW / 2, y + 66, { align: "center" });

  // Report info
  y += 95;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text("INFORME DE RESULTADOS", pageW / 2, y, { align: "center" });
  y += 12;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(data.directivo.nombre, pageW / 2, y, { align: "center" });

  // ════════════════════════════════════════════════════════════
  // PAGES 2-3 — INTRODUCTION
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  drawPageHeader();
  y = 20;

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("ENCUESTA 360° PONDERADA", pageW / 2, y, { align: "center" });
  y += 8;

  // Intro text
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const introLines = doc.splitTextToSize(INTRO_TEXT, contentW);
  doc.text(introLines, margin, y, { align: "left", maxWidth: contentW });
  y += introLines.length * 4.5 + 4;

  // Gestión Personal
  const drawGestionSection = (title: string, text: string, competencias: string[]) => {
    if (y > pageH - 60) {
      doc.addPage();
      drawPageHeader();
      y = 20;
    }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(text, contentW);
    doc.text(lines, margin, y, { align: "left", maxWidth: contentW });
    y += lines.length * 4.5 + 3;
    competencias.forEach((c) => {
      if (y > pageH - 15) {
        doc.addPage();
        drawPageHeader();
        y = 20;
      }
      const bulletIndent = 3;
      const textIndent = bulletIndent + doc.getTextWidth("• ");
      const wrappedLines = doc.splitTextToSize(c, contentW - textIndent);
      // Draw bullet on first line
      doc.text("•", margin + bulletIndent, y);
      // Draw all text lines with hanging indent
      wrappedLines.forEach((line: string, idx: number) => {
        doc.text(line, margin + textIndent, y + idx * 4.5);
      });
      const cLines = wrappedLines;
      y += cLines.length * 4.5 + 1;
    });
    y += 4;
  };

  drawGestionSection("GESTIÓN PERSONAL", GESTION_PERSONAL_TEXT, COMP_PERSONAL);
  drawGestionSection("GESTIÓN PEDAGÓGICA", GESTION_PEDAGOGICA_TEXT, COMP_PEDAGOGICA);
  drawGestionSection("GESTIÓN ADMINISTRATIVA Y COMUNITARIA", GESTION_ADMIN_TEXT, COMP_ADMIN);

  // Structure description
  if (y > pageH - 50) {
    doc.addPage();
    drawPageHeader();
    y = 20;
  }
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const structLines = doc.splitTextToSize(INFORME_STRUCTURE, contentW);
  doc.text(structLines, margin, y, { align: "left", maxWidth: contentW });

  // ════════════════════════════════════════════════════════════
  // PAGE 4 — IDENTIFICATION + OBSERVERS + BAR CHART
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  drawPageHeader();
  y = 20;

  // IDENTIFICACIÓN
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("IDENTIFICACIÓN", margin, y);
  y += 8;

  const labelColW = 55;
  const drawIdRow = (label: string, value: string) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(label, margin + labelColW, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(value || "—", margin + labelColW + 4, y);
    y += 6;
  };

  drawIdRow("DIRECTIVO/A DOCENTE", data.directivo.nombre.toUpperCase());
  drawIdRow("IDENTIFICACIÓN", data.directivo.cedula);
  drawIdRow("ENTIDAD TERRITORIAL", data.directivo.entidadTerritorial.toUpperCase());
  drawIdRow("INSTITUCIÓN EDUCATIVA", data.directivo.institucion.toUpperCase());
  drawIdRow("CÓDIGO DANE I.E.", data.directivo.codigoDane);
  y += 4;

  // OBSERVADORES — stacked horizontal bar chart (like online version)
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("OBSERVADORES", margin, y);
  y += 6;

  // Collect all unique días categories
  const allDias = new Set<string>();
  data.observadores.forEach((obs) => {
    Object.keys(obs.diasDistribution ?? {}).forEach((d) => allDias.add(d));
  });
  const diasKeys = Array.from(allDias).sort();

  // Grayscale palette for print
  const DIAS_GRAYS: [number, number, number][] = [
    [60, 60, 60], [100, 100, 100], [140, 140, 140], [175, 175, 175], [205, 205, 205]
  ];

  // Legend
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  let legX = margin;
  diasKeys.forEach((d, i) => {
    const color = DIAS_GRAYS[i % DIAS_GRAYS.length];
    doc.setFillColor(...color);
    doc.rect(legX, y, 4, 3, "F");
    doc.setTextColor(30, 30, 30);
    doc.text(d, legX + 5, y + 2.5);
    legX += doc.getTextWidth(d) + 9;
  });
  y += 7;

  // Find max total for scale
  const maxTotal = Math.max(...data.observadores.map((obs) => {
    return Object.values(obs.diasDistribution ?? {}).reduce((s, v) => s + v, 0);
  }), 1);

  const chartX = margin + 30; // space for role labels
  const chartW = contentW - 30;
  const barH = 6;
  const barGap = 4;

  data.observadores.forEach((obs) => {
    // Role label
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(obs.roleLabel, margin, y + barH / 2 + 1);

    // Stacked bars
    let bx = chartX;
    diasKeys.forEach((d, i) => {
      const val = (obs.diasDistribution ?? {})[d] ?? 0;
      if (val <= 0) return;
      const w = (val / maxTotal) * chartW;
      const color = DIAS_GRAYS[i % DIAS_GRAYS.length];
      doc.setFillColor(...color);
      doc.rect(bx, y, w, barH, "F");
      // Value label inside bar if wide enough
      if (w > 6) {
        doc.setFontSize(6);
        doc.setTextColor(255, 255, 255);
        doc.text(String(val), bx + w / 2, y + barH / 2 + 1, { align: "center" });
      }
      bx += w;
    });

    // Total at the end
    const total = Object.values(obs.diasDistribution ?? {}).reduce((s, v) => s + v, 0);
    doc.setFontSize(7);
    doc.setTextColor(30, 30, 30);
    doc.text(String(total), bx + 2, y + barH / 2 + 1);

    y += barH + barGap;
  });
  y += 4;

  // Info box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentW, 8, 1, 1, "F");
  doc.setFontSize(7);
  drawLightbulbIcon(doc, margin + 1.5, y + 4.5, 5, bulbB64);
  doc.text("Las puntuaciones se calculan a partir de sus respuestas y las de los observadores.", margin + 8, y + 5);
  y += 14;

  // RESUMEN GENERAL — Bar chart
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("RESUMEN GENERAL", margin, y);
  y += 6;

  // Legend
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const legendItems = [
    { color: COLOR_DIRECTIVO, label: "Directivo" },
    { color: COLOR_INTERNOS, label: "Administrativo(a), coordinador(a) y docente" },
    { color: COLOR_EXTERNOS, label: "Acudiente y estudiante" },
  ];
  let lx = margin;
  legendItems.forEach((item) => {
    doc.setFillColor(...item.color);
    doc.rect(lx, y, 4, 3, "F");
    doc.text(item.label, lx + 5, y + 2.5);
    lx += doc.getTextWidth(item.label) + 10;
  });
  y += 7;

  drawBarChart(doc, data.domainScores, margin, y, contentW, 55);
  y += 60;

  // Averages
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Su puntaje promedio en la autoevaluación fue`, margin, y);
  doc.setFont("helvetica", "bold");
  doc.text(`${r1(data.autoAvg)} /10`, margin + 65, y);
  doc.setFont("helvetica", "normal");
  doc.text(`La percepción promedio de los observadores fue`, margin, y + 5);
  doc.setFont("helvetica", "bold");
  doc.text(`${r1(data.observerAvg)} /10`, margin + 65, y + 5);
  y += 12;

  // Info box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentW, 8, 1, 1, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  drawLightbulbIcon(doc, margin + 1.5, y + 4.5, 5, bulbB64);
  doc.text("Analice las brechas que existen entre las puntuaciones promedio de los grupos de referencia y su puntuación en cada gestión.", margin + 8, y + 5);

  // ════════════════════════════════════════════════════════════
  // PAGE 5 — RADAR + OBSERVER ANALYSIS
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  drawPageHeader();
  y = 20;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ANÁLISIS DE LA DISTANCIA ENTRE EL DIRECTIVO Y LOS OBSERVADORES", margin, y);
  y += 6;

  drawRadarChart(doc, data.competencyScores, pageW / 2, y + 55, 48);
  y += 115;

  // (domain marks now drawn inside drawRadarChart)

  // Info box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentW, 10, 1, 1, "F");
  doc.setFontSize(7);
  drawLightbulbIcon(doc, margin + 1.5, y + 5.5, 5, bulbB64);
  doc.text("Identifique sus puntuaciones altas y bajas y compárelas con las de los observadores teniendo en cuenta la brecha entre los puntajes.", margin + 8, y + 6);
  y += 15;

  // ANÁLISIS DE OBSERVADORES
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ANÁLISIS DE OBSERVADORES", margin, y);
  y += 4;

  // Legend
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  lx = margin;
  [
    { color: COLOR_INTERNOS, label: "Administrativo(a), coordinador(a) y docente" },
    { color: COLOR_EXTERNOS, label: "Acudiente y estudiante" },
  ].forEach((item) => {
    doc.setFillColor(...item.color);
    doc.rect(lx, y, 4, 3, "F");
    doc.text(item.label, lx + 5, y + 2.5);
    lx += doc.getTextWidth(item.label) + 10;
  });
  y += 6;

  drawObserverBarChart(doc, data.competencyScores, margin, y, contentW, 50);

  // ════════════════════════════════════════════════════════════
  // PAGE 6 — STRENGTHS AND AREAS TO IMPROVE
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  drawPageHeader();
  y = 20;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ASPECTOS DESTACADOS Y POR MEJORAR", pageW / 2, y, { align: "center" });
  y += 8;

  drawQualitativeTable(doc, data, margin, y, contentW);

  // ── Add page numbers + Cosmo logo footer ──
  const totalPages = (doc.internal as { getNumberOfPages?: () => number }).getNumberOfPages?.() ?? 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Cosmo logo centered at bottom
    const cosmoW = 18;
    const cosmoH = 10;
    doc.addImage(cosmoB64, "PNG", pageW / 2 - cosmoW / 2, pageH - marginBottom - cosmoH + 2, cosmoW, cosmoH);
    // Page number
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`${i}/${totalPages}`, pageW - margin, pageH - marginBottom + 5, { align: "right" });
  }

  const nombre = data.directivo.nombre.replace(/\s+/g, "_");
  if (options.returnBlob) {
    return doc.output("blob");
  }
  doc.save(`Informe_360_${nombre}.pdf`);
}

// ══════════════════════════════════════════════════════════════
// HELPER: Draw lightbulb icon
// ══════════════════════════════════════════════════════════════

function drawLightbulbIcon(doc: jsPDF, x: number, cy: number, size: number, bulbB64: string) {
  doc.addImage(bulbB64, "PNG", x, cy - size / 2, size, size);
}

// ══════════════════════════════════════════════════════════════
// CHART DRAWING FUNCTIONS
// ══════════════════════════════════════════════════════════════

function drawBarChart(
  doc: jsPDF,
  domainScores: Reporte360Data["domainScores"],
  x: number, y: number, w: number, h: number
) {
  const chartX = x + 10;
  const chartW = w - 15;
  const chartY = y;
  const chartH = h - 10;
  const maxVal = 10;
  const groupCount = domainScores.length;
  const groupW = chartW / groupCount;
  const barW = groupW * 0.22;
  const barGap = 2;

  // Y-axis
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  for (let i = 0; i <= 5; i++) {
    const yLine = chartY + chartH - (chartH * (i * 2)) / maxVal;
    doc.line(chartX, yLine, chartX + chartW, yLine);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(String(i * 2), chartX - 3, yLine + 1, { align: "right" });
  }

  domainScores.forEach((ds, gi) => {
    const gx = chartX + gi * groupW + groupW / 2;
    const scores = [ds.autoScore, ds.internosScore, ds.externosScore];
    const colors = [COLOR_DIRECTIVO, COLOR_INTERNOS, COLOR_EXTERNOS];

    scores.forEach((score, bi) => {
      const bx = gx - (barW + barGap) * 1.5 + bi * (barW + barGap);
      const barH = (score / maxVal) * chartH;
      const by = chartY + chartH - barH;
      doc.setFillColor(...colors[bi]);
      doc.rect(bx, by, barW, barH, "F");
      // Value label
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text(r1(score), bx + barW / 2, by - 1.5, { align: "center" });
    });

    // Domain label
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    const labelLines = doc.splitTextToSize(ds.domainLabel, groupW - 4);
    doc.text(labelLines, gx, chartY + chartH + 3, { align: "center" });
  });
}

function drawRadarChart(
  doc: jsPDF,
  competencyScores: Reporte360Data["competencyScores"],
  cx: number, cy: number, radius: number
) {
  const n = competencyScores.length;
  const maxVal = 10;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2; // Start from top

  // Draw grid circles
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  for (let i = 2; i <= 10; i += 2) {
    const r = (i / maxVal) * radius;
    const pts: [number, number][] = [];
    for (let j = 0; j < n; j++) {
      const angle = startAngle + j * angleStep;
      pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
    for (let j = 0; j < n; j++) {
      const next = (j + 1) % n;
      doc.line(pts[j][0], pts[j][1], pts[next][0], pts[next][1]);
    }
    // Scale labels
    const labelAngle = startAngle;
    doc.setFontSize(5);
    doc.setTextColor(150, 150, 150);
    doc.text(String(i), cx + r * Math.cos(labelAngle) + 1.5, cy + r * Math.sin(labelAngle) + 1);
  }

  // Draw axis lines
  for (let i = 0; i < n; i++) {
    const angle = startAngle + i * angleStep;
    const ex = cx + radius * Math.cos(angle);
    const ey = cy + radius * Math.sin(angle);
    doc.setDrawColor(200, 200, 200);
    doc.line(cx, cy, ex, ey);
  }

  // Draw filled data polygons using light fill colors (no GState needed)
  const drawFilledPolygon = (getScore: (cs: typeof competencyScores[0]) => number, color: readonly [number, number, number], fillColor: readonly [number, number, number], lineWidth: number) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const score = getScore(competencyScores[i]);
      const r = (score / maxVal) * radius;
      const angle = startAngle + i * angleStep;
      pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }

    // Fill polygon with light color
    doc.setFillColor(...fillColor);
    if (pts.length > 2) {
      for (let i = 1; i < pts.length - 1; i++) {
        doc.triangle(
          pts[0][0], pts[0][1],
          pts[i][0], pts[i][1],
          pts[i + 1][0], pts[i + 1][1],
          "F"
        );
      }
    }

    // Stroke outline
    doc.setDrawColor(...color);
    doc.setLineWidth(lineWidth);
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      doc.line(pts[i][0], pts[i][1], pts[next][0], pts[next][1]);
    }
    // Dots
    pts.forEach(([px, py]) => {
      doc.setFillColor(...color);
      doc.circle(px, py, 1, "F");
    });
  };

  // Light fill colors (simulating ~15% opacity on white background)
  const FILL_OBSERVER: [number, number, number] = [248, 225, 225];   // light red
  const FILL_DIRECTIVO: [number, number, number] = [220, 235, 248];  // light blue

  drawFilledPolygon((cs) => cs.observerScore, COLOR_OBSERVER, FILL_OBSERVER, 1.2);
  drawFilledPolygon((cs) => cs.autoScore, COLOR_DIRECTIVO, FILL_DIRECTIVO, 1.2);

  // Labels
  for (let i = 0; i < n; i++) {
    const angle = startAngle + i * angleStep;
    const labelR = radius + 8;
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);
    const comp = competencyScores[i];
    const mark = COMPETENCY_DOMAIN_MARK[comp.competency] ?? "";
    const label = `${comp.competencyLabel}${mark}`;
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    const align = Math.cos(angle) < -0.1 ? "right" : Math.cos(angle) > 0.1 ? "left" : "center";
    const labelLines = doc.splitTextToSize(label, 30);
    doc.text(labelLines, lx, ly, { align: align as any });
  }

  // Legend — below the chart
  doc.setFontSize(7);
  const legY = cy + radius + 12;
  doc.setFillColor(...COLOR_OBSERVER);
  doc.rect(cx - 40, legY, 4, 3, "F");
  doc.setTextColor(30, 30, 30);
  doc.text("Observadores", cx - 35, legY + 2.5);
  doc.setFillColor(...COLOR_DIRECTIVO);
  doc.rect(cx + 5, legY, 4, 3, "F");
  doc.text("Directivo", cx + 10, legY + 2.5);

  // Domain marks explanation
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  const notesY = legY + 7;
  doc.text("* Competencias de Gestión Personal", cx - 40, notesY);
  doc.text("** Competencias de Gestión Pedagógica", cx - 40, notesY + 3.5);
  doc.text("*** Competencias de Gestión Administrativa y Comunitaria", cx - 40, notesY + 7);
}

function drawObserverBarChart(
  doc: jsPDF,
  competencyScores: Reporte360Data["competencyScores"],
  x: number, y: number, w: number, h: number
) {
  const chartX = x + 5;
  const chartW = w - 10;
  const chartH = h - 12;
  const maxVal = 10;
  const n = competencyScores.length;
  const groupW = chartW / n;
  const barW = groupW * 0.35;

  // Y-axis grid
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  for (let i = 0; i <= 5; i++) {
    const yLine = y + chartH - (chartH * (i * 2)) / maxVal;
    doc.line(chartX, yLine, chartX + chartW, yLine);
    doc.setFontSize(5);
    doc.setTextColor(150, 150, 150);
    doc.text(String(i * 2), chartX + chartW + 2, yLine + 1);
  }

  competencyScores.forEach((cs, i) => {
    const gx = chartX + i * groupW + groupW / 2;
    const scores = [cs.internosScore, cs.externosScore];
    const colors = [COLOR_INTERNOS, COLOR_EXTERNOS];

    scores.forEach((score, bi) => {
      const bx = gx - barW + bi * barW;
      const barH = (score / maxVal) * chartH;
      const by = y + chartH - barH;
      doc.setFillColor(...colors[bi]);
      doc.rect(bx, by, barW - 0.5, barH, "F");
      // Value label on top of bar
      if (score > 0) {
        doc.setFontSize(4.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        doc.text(r1(score), bx + (barW - 0.5) / 2, by - 1, { align: "center" });
      }
    });

    // Label — vertical below the chart
    const mark = COMPETENCY_DOMAIN_MARK[cs.competency] ?? "";
    const labelText = `${cs.competencyLabel}${mark}`;
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(labelText, gx, y + chartH + 3, { angle: -90 });
  });
}

function drawQualitativeTable(
  doc: jsPDF,
  data: Reporte360Data,
  x: number, y: number, w: number
) {
  // Sort items by observer score to determine strengths/weaknesses
  const sorted = [...data.itemScores].filter((i) => i.phrase).sort((a, b) => b.observerScore - a.observerScore);

  // Top 8 = strengths, bottom 8 = areas to improve
  const strengths = sorted.slice(0, 8).map((i) => i.phrase);
  const improvements = sorted.slice(-8).map((i) => i.phrase);

  // Match them into pairs for the table
  const rowCount = Math.max(strengths.length, improvements.length);
  const colW = w / 2;

  // Header
  doc.setFillColor(...COLOR_HEADER_BG);
  doc.rect(x, y, w, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("EL DIRECTIVO DOCENTE SE DESTACA POR…", x + colW / 2, y + 6, { align: "center" });
  doc.text("EL DIRECTIVO DOCENTE PUEDE TRABAJAR MÁS\nEN…", x + colW + colW / 2, y + 4.5, { align: "center" });
  y += 10;

  const pageH = doc.internal.pageSize.getHeight();

  for (let i = 0; i < rowCount; i++) {
    const leftText = strengths[i] || "";
    const rightText = improvements[i] || "";

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const leftLines = doc.splitTextToSize(leftText, colW - 6);
    const rightLines = doc.splitTextToSize(rightText, colW - 6);
    const maxLines = Math.max(leftLines.length, rightLines.length);
    const rowH = maxLines * 3.5 + 4;

    if (y + rowH > pageH - 15) {
      doc.addPage();
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Programa RLT y CLT", 15, 10);
      doc.text("Informe Encuesta de 360° Ponderada", doc.internal.pageSize.getWidth() - 15, 10, { align: "right" });
      y = 20;
    }

    // Alternating background
    if (i % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(x, y, w, rowH, "F");
    }

    // Border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(x, y, colW, rowH, "S");
    doc.rect(x + colW, y, colW, rowH, "S");

    doc.setTextColor(30, 30, 30);
    doc.text(leftLines, x + 3, y + 4);
    doc.text(rightLines, x + colW + 3, y + 4);
    y += rowH;
  }
}
