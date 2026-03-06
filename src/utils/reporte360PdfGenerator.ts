import jsPDF from "jspdf";
import type { Reporte360Data } from "./reporte360Calculator";
import { genderizeRole } from "@/utils/genderizeRole";
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

function getImageNaturalSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

// ── Color constants (grayscale for black-ink-only printing) ──
const COLOR_DIRECTIVO: [number, number, number] = [30, 30, 30];       // near-black
const COLOR_INTERNOS: [number, number, number] = [120, 120, 120];     // medium gray
const COLOR_EXTERNOS: [number, number, number] = [190, 190, 190];     // light gray
const COLOR_OBSERVER: [number, number, number] = [170, 170, 170];     // light gray
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
  logoSources: { logoRLT: string; logoCLT: string; logoCosmo?: string; coverBg?: string; lightbulb?: string },
  options: { returnBlob?: boolean } = {}
): Promise<Blob | void> {
  const cosmoSrc = logoSources.logoCosmo || (await import("@/assets/logo_cosmo.png")).default;
  const coverSrc = logoSources.coverBg || "/images/cover-bg-logo.png";
  const bulbSrc = logoSources.lightbulb || "/images/lightbulb-icon.png";
  const [rltB64, cltB64, bulbB64, cosmoB64, coverBgB64, rltSize, cltSize, cosmoSize] = await Promise.all([
    loadImageAsBase64(logoSources.logoRLT),
    loadImageAsBase64(logoSources.logoCLT),
    loadImageAsBase64(bulbSrc),
    loadImageAsBase64(cosmoSrc),
    loadImageAsBase64(coverSrc),
    getImageNaturalSize(logoSources.logoRLT),
    getImageNaturalSize(logoSources.logoCLT),
    getImageNaturalSize(cosmoSrc),
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

  // Logos at natural size reduced by 50% (pixels to mm at 96 DPI: px * 25.4 / 96)
  const pxToMm = 25.4 / 96 * 0.50;
  const rltW = rltSize.width * pxToMm;
  const rltH = rltSize.height * pxToMm;
  const cltW = cltSize.width * pxToMm;
  const cltH = cltSize.height * pxToMm;
  doc.addImage(rltB64, "PNG", margin, 25, rltW, rltH);
  doc.addImage(cltB64, "PNG", pageW - margin - cltW, 25, cltW, cltH);

  // Title block
  let y = 75;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PROGRAMA", pageW / 2, y, { align: "center" });
  y += 8;
  doc.text("RECTORES LÍDERES TRANSFORMADORES", pageW / 2, y, { align: "center" });
  y += 8;
  doc.text("COORDINADORES LÍDERES TRANSFORMADORES", pageW / 2, y, { align: "center" });

  // Central decorative area with background logo
  y += 20;
  const boxX = margin + 20;
  const boxW = contentW - 40;
  const boxH = 80;
  // Background logo centered behind text
  const bgLogoSize = 75;
  doc.addImage(coverBgB64, "PNG", pageW / 2 - bgLogoSize / 2, y + (boxH - bgLogoSize) / 2, bgLogoSize, bgLogoSize);
  // Text on top
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
  y = 25;

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
    if (y > pageH - 65) {
      doc.addPage();
      drawPageHeader();
      y = 25;
    }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(title, margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(text, contentW);
    doc.text(lines, margin, y, { align: "left", maxWidth: contentW });
    y += lines.length * 4.5 + 3;
    competencias.forEach((c) => {
      if (y > pageH - 25) {
        doc.addPage();
        drawPageHeader();
        y = 25;
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
  doc.addPage();
  drawPageHeader();
  y = 25;
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
  y = 25;

  // IDENTIFICACIÓN
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
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

  drawIdRow("PAR EVALUADO/A", data.directivo.nombre.toUpperCase());
  drawIdRow("IDENTIFICACIÓN", data.directivo.cedula);
  drawIdRow("ENTIDAD TERRITORIAL", data.directivo.entidadTerritorial.toUpperCase());
  drawIdRow("INSTITUCIÓN EDUCATIVA", data.directivo.institucion.toUpperCase());
  drawIdRow("CÓDIGO DANE I.E.", data.directivo.codigoDane);
  y += 4;

  // OBSERVADORES — table format matching model PDF
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("OBSERVADORES", margin, y);
  y += 5;

  // Table header
  const col1W = 45; // NÚMERO DE ENCUESTADOS
  const col2W = 50; // ROL
  const col3W = contentW - col1W - col2W; // INTERACCIÓN
  const rowH = 7;

  doc.setFillColor(...COLOR_HEADER_BG);
  doc.rect(margin, y, contentW, rowH, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("NÚMERO DE ENCUESTADOS", margin + col1W / 2, y + rowH / 2 + 1, { align: "center" });
  doc.text("ROL", margin + col1W + col2W / 2, y + rowH / 2 + 1, { align: "center" });
  doc.text("INTERACCIÓN ANTES DE LA ENCUESTA", margin + col1W + col2W + col3W / 2, y + rowH / 2 + 1, { align: "center" });
  y += rowH;

  // Table rows
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  data.observadores.forEach((obs, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y, contentW, rowH, "F");
    }
    // Vertical lines
    doc.setDrawColor(200, 200, 200);
    doc.line(margin + col1W, y, margin + col1W, y + rowH);
    doc.line(margin + col1W + col2W, y, margin + col1W + col2W, y + rowH);

    doc.setFontSize(8);
    doc.text(String(obs.count), margin + col1W / 2, y + rowH / 2 + 1, { align: "center" });
    doc.text(obs.roleLabel, margin + col1W + 3, y + rowH / 2 + 1);

    // Draw dias as individual rounded badges
    const diasEntries = Object.entries(obs.diasDistribution);
    if (diasEntries.length === 0) {
      doc.text("—", margin + col1W + col2W + 3, y + rowH / 2 + 1);
    } else {
      let badgeX = margin + col1W + col2W + 3;
      const badgeY = y + 1.2;
      const badgeH = 4.5;
      const badgePadding = 2;
      const badgeGap = 3;
      doc.setFontSize(6.5);
      diasEntries.forEach(([dias, count]) => {
        const label = dias || "—";
        const textW = doc.getTextWidth(label);
        const badgeW = textW + badgePadding * 2 + 4; // extra space for count circle
        // Badge background and border
        doc.setFillColor(240, 240, 240);
        doc.setDrawColor(190, 190, 190);
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, "FD");
        doc.setTextColor(60, 60, 60);
        doc.text(label, badgeX + badgePadding, badgeY + badgeH / 2 + 1);
        // Count number in top-right corner
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(5);
        doc.setFont("helvetica", "bold");
        doc.text(String(count), badgeX + badgeW - 1.5, badgeY + 2.2, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(6.5);
        doc.setTextColor(60, 60, 60);
        badgeX += badgeW + badgeGap;
      });
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(8);
    }
    y += rowH;
  });
  // Bottom border
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, margin + contentW, y);
  y += 4;

  // Info box — centered
  const infoText0 = "Las puntuaciones se calculan a partir de sus respuestas y las de los observadores.";
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const infoTextW0 = doc.getTextWidth(infoText0);
  const iconW0 = 5;
  const gap0 = 2;
  const totalW0 = iconW0 + gap0 + infoTextW0;
  const startX0 = margin + (contentW - totalW0) / 2;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentW, 8, 1, 1, "F");
  drawLightbulbIcon(doc, startX0, y + 4.5, iconW0, bulbB64);
  doc.text(infoText0, startX0 + iconW0 + gap0, y + 5);
  y += 20;

  // RESUMEN GENERAL — Bar chart
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("RESUMEN GENERAL", margin, y);
  y += 6;

  // Legend
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const g = data.directivo.genero;
  const legendItems = [
    { color: COLOR_DIRECTIVO, label: genderizeRole("Directivo Par", g) },
    { color: COLOR_INTERNOS, label: genderizeRole("Administrativo(a), coordinador(a) y docente", g) },
    { color: COLOR_EXTERNOS, label: "Acudiente y estudiante" },
  ];
  // Calculate total legend width first
  let totalLegendW = 0;
  legendItems.forEach((item, i) => {
    totalLegendW += 4 + 1 + doc.getTextWidth(item.label) + (i < legendItems.length - 1 ? 6 : 0);
  });
  let lx = (pageW - totalLegendW) / 2;
  legendItems.forEach((item, i) => {
    doc.setFillColor(...item.color);
    doc.rect(lx, y, 4, 3, "F");
    doc.text(item.label, lx + 5, y + 2.5);
    lx += 4 + 1 + doc.getTextWidth(item.label) + 6;
  });
  y += 7;

  drawBarChart(doc, data.domainScores, margin, y, contentW, 55);
  y += 60;

  // Averages — centered
  doc.setFontSize(8);
  const avgLine1 = `Su puntaje promedio en la autoevaluación fue  ${r1(data.autoAvg)} /10`;
  const avgLine2 = `La percepción promedio de los observadores fue  ${r1(data.observerAvg)} /10`;
  doc.setFont("helvetica", "normal");
  // Line 1
  const avg1Text = "Su puntaje promedio en la autoevaluación fue  ";
  const avg1Val = `${r1(data.autoAvg)} /10`;
  const avg1W = doc.getTextWidth(avg1Text) + doc.getTextWidth(avg1Val);
  let ax = (pageW - avg1W) / 2;
  doc.text(avg1Text, ax, y);
  doc.setFont("helvetica", "bold");
  doc.text(avg1Val, ax + doc.getTextWidth(avg1Text), y);
  // Line 2
  doc.setFont("helvetica", "normal");
  const avg2Text = "La percepción promedio de los observadores fue  ";
  const avg2Val = `${r1(data.observerAvg)} /10`;
  const avg2W = doc.getTextWidth(avg2Text) + doc.getTextWidth(avg2Val);
  ax = (pageW - avg2W) / 2;
  doc.text(avg2Text, ax, y + 5);
  doc.setFont("helvetica", "bold");
  doc.text(avg2Val, ax + doc.getTextWidth(avg2Text), y + 5);
  y += 12;

  // Info box — centered
  const infoText1 = "Analice las brechas que existen entre las puntuaciones promedio de los grupos de referencia y su puntuación en cada gestión.";
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const infoTextW1 = doc.getTextWidth(infoText1);
  const iconW1 = 5;
  const gap1 = 2;
  const totalW1 = iconW1 + gap1 + infoTextW1;
  const startX1 = margin + (contentW - totalW1) / 2;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentW, 8, 1, 1, "F");
  drawLightbulbIcon(doc, startX1, y + 4.5, iconW1, bulbB64);
  doc.text(infoText1, startX1 + iconW1 + gap1, y + 5);

  // ════════════════════════════════════════════════════════════
  // PAGE 5 — RADAR CHART + COMPETENCY TABLE
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  drawPageHeader();
  y = 25;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("ANÁLISIS DE LA DISTANCIA ENTRE EL PAR Y LOS OBSERVADORES", margin, y);
  y += 6;

  drawRadarChart(doc, data.competencyScores, pageW / 2, y + 48, 38);
  y += 121;

  // ── Competency table ──
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("PUNTUACIONES POR COMPETENCIA", margin, y);
  y += 5;

  {
    const tableHeaders = ["Competencia", "Autoevaluación", "Pares, Docentes y Administrativos", "Estudiantes y Acudientes"];
    const colWidths = [contentW * 0.46, contentW * 0.18, contentW * 0.18, contentW * 0.18];
    const rowH = 5.5;

    // Header row
    const headerH = 10;
    doc.setFillColor(230, 230, 230);
    doc.rect(margin, y, contentW, headerH, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    let tx = margin;
    tableHeaders.forEach((h, hi) => {
      if (hi === 0) {
        doc.text(h, tx + 2, y + 6);
      } else {
        const lines = doc.splitTextToSize(h, colWidths[hi] - 2);
        const startY = y + (headerH / 2) - ((lines.length - 1) * 3) / 2 + 1;
        doc.text(lines, tx + colWidths[hi] / 2, startY, { align: "center" });
      }
      tx += colWidths[hi];
    });
    y += headerH;

    // Data rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    data.competencyScores.forEach((c, i) => {
      if (i % 2 === 1) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y, contentW, rowH, "F");
      }
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(margin, y + rowH, margin + contentW, y + rowH);

      const label = COMPETENCY_LABELS[c.competency] ?? c.competency;
      tx = margin;
      doc.setTextColor(0, 0, 0);
      doc.text(label, tx + 2, y + 3.8);
      tx += colWidths[0];
      doc.setFont("helvetica", "bold");
      doc.text(c.autoScore.toFixed(1), tx + colWidths[1] / 2, y + 3.8, { align: "center" });
      tx += colWidths[1];
      doc.text(c.internosScore.toFixed(1), tx + colWidths[2] / 2, y + 3.8, { align: "center" });
      tx += colWidths[2];
      doc.text(c.externosScore.toFixed(1), tx + colWidths[3] / 2, y + 3.8, { align: "center" });
      doc.setFont("helvetica", "normal");
      y += rowH;
    });
  }

  // Info box
  // Info box — centered
  y += 4;
  const infoText2 = "Identifique sus puntuaciones altas y bajas y compárelas con las de los observadores teniendo en cuenta la brecha entre los puntajes.";
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const infoTextW2 = doc.getTextWidth(infoText2);
  const iconW2 = 5;
  const gap2 = 2;
  const totalW2 = iconW2 + gap2 + infoTextW2;
  const startX2 = margin + (contentW - totalW2) / 2;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentW, 10, 1, 1, "F");
  drawLightbulbIcon(doc, startX2, y + 5.5, iconW2, bulbB64);
  doc.text(infoText2, startX2 + iconW2 + gap2, y + 6);

  // ════════════════════════════════════════════════════════════
  // PAGE 7 — OBSERVER ANALYSIS
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  drawPageHeader();
  y = 25;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("ANÁLISIS DE OBSERVADORES", margin, y);
  y += 6;

  // Legend
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const obsLegendItems = [
    { color: [30, 30, 30] as [number, number, number], label: genderizeRole("Administrativo(a), coordinador(a) y docente", g) },
    { color: [128, 128, 128] as [number, number, number], label: "Acudiente y estudiante" },
  ];
  let totalObsLegW = 0;
  obsLegendItems.forEach((item, i) => {
    totalObsLegW += 4 + 1 + doc.getTextWidth(item.label) + (i < obsLegendItems.length - 1 ? 6 : 0);
  });
  lx = (pageW - totalObsLegW) / 2;
  obsLegendItems.forEach((item) => {
    doc.setFillColor(...item.color);
    doc.rect(lx, y, 4, 3, "F");
    doc.text(item.label, lx + 5, y + 2.5);
    lx += 4 + 1 + doc.getTextWidth(item.label) + 6;
  });
  y += 8;

  drawObserverBarChart(doc, data.competencyScores, margin, y, contentW, 60);
  y += 95;

  // STRENGTHS AND AREAS TO IMPROVE — same page as observer chart
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("ASPECTOS DESTACADOS Y POR MEJORAR", pageW / 2, y, { align: "center" });
  y += 8;

  drawQualitativeTable(doc, data, margin, y, contentW);

  // ── Add page numbers + Cosmo logo footer ──
  const totalPages = (doc.internal as { getNumberOfPages?: () => number }).getNumberOfPages?.() ?? 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = pageH - marginBottom + 5;
    // Cosmo logo at left — proportional
    const cosmoTargetH = 10;
    const cosmoW = cosmoTargetH * (cosmoSize.width / cosmoSize.height);
    doc.addImage(cosmoB64, "PNG", margin, footerY - cosmoTargetH / 2 - 1, cosmoW, cosmoTargetH);
    // Page number at right, same baseline
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`${i}/${totalPages}`, pageW - margin, footerY, { align: "right" });
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



  // Draw filled data polygons with true PDF transparency
  const drawFilledPolygon = (getScore: (cs: typeof competencyScores[0]) => number, color: readonly [number, number, number], lineWidth: number, fillOpacity: number) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const score = getScore(competencyScores[i]);
      const r = (score / maxVal) * radius;
      const angle = startAngle + i * angleStep;
      pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }

    // Transparent fill using GState
    if (pts.length > 2) {
      doc.saveGraphicsState();
      doc.setGState(new (doc as any).GState({ opacity: fillOpacity }));
      doc.setFillColor(...color);
      for (let i = 1; i < pts.length - 1; i++) {
        doc.triangle(
          pts[0][0], pts[0][1],
          pts[i][0], pts[i][1],
          pts[i + 1][0], pts[i + 1][1],
          "F"
        );
      }
      doc.restoreGraphicsState();
    }

    // Stroke outline (full opacity)
    doc.setDrawColor(...color);
    doc.setLineWidth(lineWidth);
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      doc.line(pts[i][0], pts[i][1], pts[next][0], pts[next][1]);
    }
    // Dots
    pts.forEach(([px, py]) => {
      doc.setFillColor(...color);
      doc.circle(px, py, 1.2, "F");
    });
  };

  drawFilledPolygon((cs) => cs.observerScore, COLOR_OBSERVER, 1.5, 0.15);
  drawFilledPolygon((cs) => cs.autoScore, COLOR_DIRECTIVO, 1.5, 0.15);

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
  const markX = cx - 40;
  const labelX = markX + 10;
  doc.text("*", markX, notesY, { align: "left" });
  doc.text("Competencias de Gestión Personal", labelX, notesY);
  doc.text("**", markX, notesY + 3.5, { align: "left" });
  doc.text("Competencias de Gestión Pedagógica", labelX, notesY + 3.5);
  doc.text("***", markX, notesY + 7, { align: "left" });
  doc.text("Competencias de Gestión Administrativa y Comunitaria", labelX, notesY + 7);
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
    const colors: [number, number, number][] = [[30, 30, 30], [128, 128, 128]];

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
  // Sort items by observer score — exclude items with no valid observer data (score 0 means "No sé" only)
  const sorted = [...data.itemScores].filter((i) => i.phrase && i.observerScore > 0).sort((a, b) => b.observerScore - a.observerScore);

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
