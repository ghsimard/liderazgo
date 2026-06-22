import jsPDF from "jspdf";
import {
  loadPdfLogos,
  drawCoverLogos,
  drawPageHeaderLogos,
  drawFooterCosmo,
  CONTENT_START_Y,
  CONTENT_BOTTOM_MARGIN,
  type LoadedLogos,
} from "@/utils/pdfLogoHelper";

export interface DeltaSection {
  title: string;
  ini: number | null;
  evo: number | null;
  delta: number | null;
}

export interface DeltaGroup {
  grupo: string; // docentes | estudiantes | acudientes
  countIni: number;
  countEvo: number;
  iniGlobal: number | null;
  evoGlobal: number | null;
  deltaGlobal: number | null;
  sections: DeltaSection[];
}

export interface InstitucionDeltaRow {
  institucion: string;
  countIni: number;
  countEvo: number;
  ini: number | null;
  evo: number | null;
  delta: number | null;
}

export interface AmbienteDeltaReportData {
  cohorteNombre: string;
  fechaInicial?: string | null;
  fechaEvolucion?: string | null;
  maxScore: number;
  cohortIni: number | null;
  cohortEvo: number | null;
  cohortDelta: number | null;
  groups: DeltaGroup[];
  institucionesDeltas?: InstitucionDeltaRow[];
  iesConEvolucionCount?: number;
  iesTotalCohorteCount?: number;
  analysisHtml?: string;
}

export interface AmbienteDeltaPdfLogos {
  logoRLT: string;
  logoCLT: string;
  logoCosmo: string;
  showLogoRLT: boolean;
  showLogoCLT: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────
function fmt(n: number | null): string {
  return n === null ? "—" : n.toFixed(2);
}
function deltaSign(d: number | null): string {
  if (d === null) return "—";
  if (d > 0.05) return "▲";
  if (d < -0.05) return "▼";
  return "=";
}
function deltaColor(d: number | null): [number, number, number] {
  if (d === null) return [120, 120, 120];
  if (d > 0.05) return [22, 163, 74]; // green
  if (d < -0.05) return [220, 38, 38]; // red
  return [120, 120, 120];
}
function stripHtml(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  // Accept YYYY-MM-DD or full ISO; output DD/MM/YYYY
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

const STATIC_NOTACION_PARAGRAPHS: string[] = [
  "El análisis comparativo (Δ) se calcula entre dos campañas de medición de la misma cohorte: la fase Inicial (línea base) y la fase de Evolución (cierre).",
  "Cada respuesta se codifica en una escala Likert de frecuencia de 1 a 5 puntos, donde 1 = Nunca y 5 = Siempre. Las opciones intermedias (Casi nunca, A veces, Casi siempre) reciben los valores 2, 3 y 4 respectivamente.",
  "Por cada sección y grupo (Docentes, Estudiantes, Acudientes) se obtiene el promedio aritmético de todos los ítems Likert respondidos. El Δ corresponde a la diferencia: Promedio Evolución − Promedio Inicial.",
  "Umbral de significatividad pedagógica: ΔP ≥ 0.5 puntos se considera una mejora notable; ΔP ≤ −0.5 puntos indica un retroceso a atender. Variaciones inferiores a |0.05| se consideran estables.",
  "Convención visual: ▲ (verde) indica mejora, ▼ (rojo) indica retroceso, = (gris) indica estabilidad. El porcentaje entre paréntesis expresa la variación relativa respecto al valor inicial.",
  "El promedio global de la cohorte corresponde a la media no ponderada de los promedios obtenidos por los tres grupos encuestados.",
];

export async function generarPDFAmbienteDelta(
  data: AmbienteDeltaReportData,
  logoSources: AmbienteDeltaPdfLogos,
): Promise<void> {
  const logos: LoadedLogos = await loadPdfLogos(
    { logoRLT: logoSources.logoRLT, logoCLT: logoSources.logoCLT, logoCosmo: logoSources.logoCosmo },
    logoSources.showLogoRLT,
    logoSources.showLogoCLT,
  );

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 0;

  const addFooter = (pageNum: number) => {
    drawFooterCosmo(doc, logos, { margin, pageW, pageH, pageNum });
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - CONTENT_BOTTOM_MARGIN) {
      addFooter(doc.getNumberOfPages());
      doc.addPage();
      drawPageHeaderLogos(doc, logos, { margin, pageW });
      y = CONTENT_START_Y;
    }
  };

  // ─── PAGE 1 — COVER ───
  y = 30;
  y = drawCoverLogos(doc, logos, { y, pageW, targetH: 28 }) + 22;

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("INFORME COMPARATIVO Δ", pageW / 2, y, { align: "center" });
  y += 9;
  doc.setFontSize(15);
  doc.setTextColor(80, 80, 80);
  doc.text("Ambiente Escolar — Inicial vs. Evolución", pageW / 2, y, { align: "center" });
  y += 16;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(`Cohorte: ${data.cohorteNombre}`, pageW / 2, y, { align: "center" });
  y += 12;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha de generación: ${fmtDate(new Date().toISOString())}`, pageW / 2, y, { align: "center" });
  y += 7;
  doc.text(`Campaña Inicial: ${fmtDate(data.fechaInicial)}`, pageW / 2, y, { align: "center" });
  y += 6;
  doc.text(`Campaña Evolución: ${fmtDate(data.fechaEvolucion)}`, pageW / 2, y, { align: "center" });
  y += 12;

  // Cohort summary box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin + 20, y, contentW - 40, 30, 2, 2, "FD");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);
  doc.text("Δ GLOBAL DE LA COHORTE", pageW / 2, y + 7, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Inicial: ${fmt(data.cohortIni)} / ${data.maxScore}    ·    Evolución: ${fmt(data.cohortEvo)} / ${data.maxScore}`,
    pageW / 2, y + 15, { align: "center" });
  const dc = deltaColor(data.cohortDelta);
  doc.setTextColor(dc[0], dc[1], dc[2]);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  const deltaLabel = data.cohortDelta === null
    ? "Sin datos comparables"
    : `${deltaSign(data.cohortDelta)}  ${data.cohortDelta > 0 ? "+" : ""}${data.cohortDelta.toFixed(2)} pt`;
  doc.text(deltaLabel, pageW / 2, y + 25, { align: "center" });

  addFooter(1);

  // ─── PAGE 2 — SISTEMA DE CALIFICACIÓN ───
  doc.addPage();
  drawPageHeaderLogos(doc, logos, { margin, pageW });
  y = CONTENT_START_Y;

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Sistema de calificación", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  for (const p of STATIC_NOTACION_PARAGRAPHS) {
    const lines = doc.splitTextToSize(p, contentW);
    ensureSpace(lines.length * 5 + 4);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 4;
  }

  // ─── PAGE 3+ — DELTAS POR GRUPO ───
  doc.addPage();
  drawPageHeaderLogos(doc, logos, { margin, pageW });
  y = CONTENT_START_Y;

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Detalle por grupo", margin, y);
  y += 8;

  for (const g of data.groups) {
    ensureSpace(28);

    // Group header
    doc.setFillColor(235, 240, 248);
    doc.rect(margin, y, contentW, 9, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    const groupLabel = g.grupo.charAt(0).toUpperCase() + g.grupo.slice(1);
    doc.text(groupLabel, margin + 2, y + 6);

    const dc2 = deltaColor(g.deltaGlobal);
    doc.setTextColor(dc2[0], dc2[1], dc2[2]);
    const dGlobal = g.deltaGlobal === null
      ? "—"
      : `${deltaSign(g.deltaGlobal)} ${g.deltaGlobal > 0 ? "+" : ""}${g.deltaGlobal.toFixed(2)} pt`;
    doc.text(dGlobal, pageW - margin - 2, y + 6, { align: "right" });
    y += 9;

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Inicial: ${g.countIni} respuestas  ·  Evolución: ${g.countEvo} respuestas  ·  Promedios globales: ${fmt(g.iniGlobal)} → ${fmt(g.evoGlobal)} / ${data.maxScore}`,
      margin + 2, y + 4
    );
    y += 8;

    // Section rows
    const colW = [contentW * 0.5, contentW * 0.15, contentW * 0.15, contentW * 0.2];
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text("Sección", margin + 1, y + 4);
    doc.text("Inicial", margin + colW[0] + colW[1], y + 4, { align: "right" });
    doc.text("Evolución", margin + colW[0] + colW[1] + colW[2], y + 4, { align: "right" });
    doc.text("Δ", margin + contentW - 1, y + 4, { align: "right" });
    y += 5;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, margin + contentW, y);
    y += 1;

    doc.setFont("helvetica", "normal");
    for (const sec of g.sections) {
      ensureSpace(7);
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 50);
      const titleLines = doc.splitTextToSize(sec.title, colW[0] - 2);
      doc.text(titleLines[0], margin + 1, y + 4);
      doc.setTextColor(70, 70, 70);
      doc.text(`${fmt(sec.ini)} / ${data.maxScore}`, margin + colW[0] + colW[1], y + 4, { align: "right" });
      doc.text(`${fmt(sec.evo)} / ${data.maxScore}`, margin + colW[0] + colW[1] + colW[2], y + 4, { align: "right" });
      const dc3 = deltaColor(sec.delta);
      doc.setTextColor(dc3[0], dc3[1], dc3[2]);
      doc.setFont("helvetica", "bold");
      const dTxt = sec.delta === null
        ? "—"
        : `${deltaSign(sec.delta)} ${sec.delta > 0 ? "+" : ""}${sec.delta.toFixed(2)}`;
      doc.text(dTxt, margin + contentW - 1, y + 4, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 6;
    }
    y += 6;
  }

  // ─── ANÁLISIS AUTOMATIZADO ───
  doc.addPage();
  drawPageHeaderLogos(doc, logos, { margin, pageW });
  y = CONTENT_START_Y;

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Análisis automatizado", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  if (!data.analysisHtml || data.analysisHtml.trim().length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    const placeholder = "— Genere el análisis automatizado en la interfaz antes de exportar este informe para incluir la interpretación interpretativa de los resultados. —";
    const lines = doc.splitTextToSize(placeholder, contentW);
    doc.text(lines, margin, y);
  } else {
    const text = stripHtml(data.analysisHtml);
    const paragraphs = text.split(/\n\n+/);
    for (const p of paragraphs) {
      if (!p.trim()) continue;
      const lines = doc.splitTextToSize(p.trim(), contentW);
      ensureSpace(lines.length * 5 + 4);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 4;
    }
  }

  // Footers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i);
  }

  const safeCohorte = data.cohorteNombre.replace(/[^a-zA-Z0-9-_]+/g, "_");
  doc.save(`Informe_Delta_AmbienteEscolar_${safeCohorte}.pdf`);
}
