import jsPDF from "jspdf";
import { FREQUENCY_OPTIONS, GRADOS_COMPLETOS, GRADOS_ESTUDIANTE, ANOS_OPTIONS, FUENTES_RETROALIMENTACION } from "@/data/ambienteEscolarData";
import {
  SAN_COLORS,
  SAN_LABELS,
  SECTION_NAMES,
  UNIFIED_REPORT_ITEMS,
  REPORT_INTRO_TEXT,
  REPORT_INTRO_TEXT_PAGE3,
  HELP_BOX_ENCUESTADOS,
  HELP_BOX_RESUMEN,
  HELP_BOX_FORTALEZAS,
  HELP_BOX_RETOS,
  LIKERT_BY_ROLE,
  type SectionName,
} from "@/data/ambienteEscolarReportData";
import { loadImageAsBase64, getImageNaturalSize, logoDims, COVER_LOGO_H, FOOTER_COSMO_H, FOOTER_Y_OFFSET, CONTENT_BOTTOM_MARGIN } from "@/utils/pdfLogoHelper";

// ── Types ──
export interface AmbienteReportData {
  institucion: string;
  entidadTerritorial: string;
  submissions: {
    tipo_formulario: string;
    respuestas: Record<string, any>;
  }[];
}

interface LogoSources {
  logoRLT: string;
  logoCLT: string;
  logoCosmo?: string;
}

type SANKey = "S" | "A" | "N";

// ── Compute S/A/N percentages for a section ──
function computeSAN(
  submissions: AmbienteReportData["submissions"],
  role: string,
  sectionTitle: string
): { S: number; A: number; N: number; total: number } {
  const sections = LIKERT_BY_ROLE[role];
  if (!sections) return { S: 0, A: 0, N: 0, total: 0 };
  const sec = sections.find((s) => s.title === sectionTitle);
  if (!sec) return { S: 0, A: 0, N: 0, total: 0 };

  const roleSubs = submissions.filter((s) => s.tipo_formulario === role);
  let sCount = 0, aCount = 0, nCount = 0, total = 0;

  for (const sub of roleSubs) {
    for (const item of sec.items) {
      const val = sub.respuestas?.[item.id];
      if (!val) continue;
      total++;
      if (val === "Siempre" || val === "Casi siempre") sCount++;
      else if (val === "A veces") aCount++;
      else if (val === "Casi nunca" || val === "Nunca") nCount++;
    }
  }

  if (total === 0) return { S: 0, A: 0, N: 0, total: 0 };
  return {
    S: Math.round((sCount / total) * 100),
    A: Math.round((aCount / total) * 100),
    N: Math.round((nCount / total) * 100),
    total,
  };
}

// ── Compute S/A/N for a single item ID within a role ──
function computeItemSAN(
  submissions: AmbienteReportData["submissions"],
  role: string,
  itemId: string
): { S: number; A: number; N: number; total: number } {
  const roleSubs = submissions.filter((s) => s.tipo_formulario === role);
  let sCount = 0, aCount = 0, nCount = 0, total = 0;

  for (const sub of roleSubs) {
    const val = sub.respuestas?.[itemId];
    if (!val) continue;
    total++;
    if (val === "Siempre" || val === "Casi siempre") sCount++;
    else if (val === "A veces") aCount++;
    else if (val === "Casi nunca" || val === "Nunca") nCount++;
  }

  if (total === 0) return { S: 0, A: 0, N: 0, total: 0 };
  return {
    S: Math.round((sCount / total) * 100),
    A: Math.round((aCount / total) * 100),
    N: Math.round((nCount / total) * 100),
    total,
  };
}

// ── Draw a pie chart on a temporary canvas, return data URL ──
function drawPieChart(
  data: { label: string; value: number; color: string }[],
  size: number = 200
): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2, cy = size / 2, r = size / 2 - 10;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return canvas.toDataURL("image/png");

  let startAngle = -Math.PI / 2;
  for (const d of data) {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = d.color;
    ctx.fill();
    if (d.value > 0) {
      const midAngle = startAngle + sliceAngle / 2;
      const lx = cx + (r * 0.65) * Math.cos(midAngle);
      const ly = cy + (r * 0.65) * Math.sin(midAngle);
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.round(size / 12)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const pct = Math.round((d.value / total) * 100);
      if (pct >= 5) ctx.fillText(`${pct}%`, lx, ly);
    }
    startAngle += sliceAngle;
  }
  return canvas.toDataURL("image/png");
}

// ── Draw horizontal bar chart for counts ──
function drawHorizontalBarChart(
  labels: string[],
  values: number[],
  barColor: string,
  width: number = 400,
  height: number = 200
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const maxVal = Math.max(...values, 1);
  const barH = Math.min(20, (height - 20) / labels.length - 4);
  const labelW = 100;
  const barAreaW = width - labelW - 40;

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < labels.length; i++) {
    const yy = 10 + i * (barH + 6);
    // Label
    ctx.fillStyle = "#333";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(labels[i], labelW - 5, yy + barH / 2);
    // Bar
    const bw = values[i] > 0 ? (values[i] / maxVal) * barAreaW : 0;
    if (bw > 0) {
      ctx.fillStyle = barColor;
      ctx.fillRect(labelW, yy, bw, barH);
    }
    // Value
    ctx.fillStyle = "#333";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(String(values[i]), labelW + bw + 5, yy + barH / 2);
  }
  return canvas.toDataURL("image/png");
}

// ── Main Generator ──
export async function generarAmbienteEscolarReportPDF(
  data: AmbienteReportData,
  logoSources: LogoSources,
  logoFlags: { showLogoRlt?: boolean; showLogoClt?: boolean } = {},
  options: { returnBlob?: boolean } = {}
): Promise<Blob | void> {
  const showRlt = logoFlags.showLogoRlt ?? true;
  const showClt = logoFlags.showLogoClt ?? true;
  const cosmoSrc = logoSources.logoCosmo || (await import("@/assets/logo_cosmo.png")).default;

  const [rltB64, cltB64, cosmoB64, cosmoSize] = await Promise.all([
    showRlt ? loadImageAsBase64(logoSources.logoRLT) : Promise.resolve(""),
    showClt ? loadImageAsBase64(logoSources.logoCLT) : Promise.resolve(""),
    loadImageAsBase64(cosmoSrc),
    getImageNaturalSize(cosmoSrc),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Helpers ──
  const bottomLimit = pageH - CONTENT_BOTTOM_MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > bottomLimit) {
      drawPageFooter(pageNum);
      doc.addPage();
      pageNum++;
      drawPageHeader();
    }
  };

  let pageNum = 1;

  const drawPageHeader = () => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Programa RLT y CLT", margin, 10);
    doc.text("Informe Encuesta de Ambiente Escolar", pageW - margin, 10, { align: "right" });
    y = 32;
  };

  const drawPageFooter = (pn: number) => {
    const cosmoH = FOOTER_COSMO_H;
    const cosmoW = cosmoH * (cosmoSize.width / cosmoSize.height);
    const fY = pageH - FOOTER_Y_OFFSET;
    if (cosmoB64) {
      try { doc.addImage(cosmoB64, "PNG", margin, fY, cosmoW, cosmoH); } catch { /* */ }
    }
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`${pn}`, pageW - margin, fY + cosmoH / 2 + 1, { align: "right" });
  };

  const wrapText = (text: string, maxW: number, fontSize: number): string[] => {
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(text, maxW) as string[];
  };

  // ── Draw a help box with ! icon ──
  const drawHelpBox = (text: string) => {
    const lines = wrapText(text, contentW - 14, 7);
    const boxH = Math.max(8, lines.length * 3 + 5);
    ensureSpace(boxH + 2);
    doc.setFillColor(180, 0, 0);
    doc.rect(margin, y, 2.5, boxH, "F");
    doc.setDrawColor(180, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(margin, y, contentW, boxH);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 0, 0);
    doc.text("!", margin + 6, y + boxH / 2 + 1.5, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(lines, margin + 12, y + 3.5);
    y += boxH + 2;
  };

  // ── Compact highlighted note (used on ENCUESTADOS) ──
  const drawHighlightedNote = (text: string) => {
    const lines = wrapText(text, contentW - 6, 10);
    const lineH = 4.2;
    const noteH = Math.max(7, lines.length * lineH + 2);
    const noteY = Math.min(y, bottomLimit - noteH);

    doc.setFillColor(70, 70, 70);
    doc.rect(margin, noteY, contentW, noteH, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(255, 255, 255);
    doc.text(lines, margin + 2, noteY + 3.4);

    y = noteY + noteH + 1.5;
  };

  const ROLES = ["docentes", "estudiantes", "acudientes"] as const;
  const ROLE_LABELS: Record<string, string> = {
    docentes: "DOCENTES",
    estudiantes: "ESTUDIANTES",
    acudientes: "ACUDIENTES",
  };
  const ROLE_COLORS: Record<string, [number, number, number]> = {
    docentes: [41, 98, 255],
    estudiantes: [255, 152, 0],
    acudientes: [156, 39, 176],
  };

  const roleCounts: Record<string, number> = {};
  for (const r of ROLES) {
    roleCounts[r] = data.submissions.filter((s) => s.tipo_formulario === r).length;
  }

  // ════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ════════════════════════════════════════════════════════════
  if (showRlt && rltB64) {
    const rltSize = await getImageNaturalSize(logoSources.logoRLT);
    const rltDims = logoDims(rltSize.width, rltSize.height, COVER_LOGO_H);
    if (showClt) {
      doc.addImage(rltB64, "PNG", margin, 20, rltDims.w, rltDims.h);
    } else {
      doc.addImage(rltB64, "PNG", (pageW - rltDims.w) / 2, 20, rltDims.w, rltDims.h);
    }
  }
  if (showClt && cltB64) {
    const cltSize = await getImageNaturalSize(logoSources.logoCLT);
    const cltDims = logoDims(cltSize.width, cltSize.height, COVER_LOGO_H);
    if (showRlt) {
      doc.addImage(cltB64, "PNG", pageW - margin - cltDims.w, 20, cltDims.w, cltDims.h);
    } else {
      doc.addImage(cltB64, "PNG", (pageW - cltDims.w) / 2, 20, cltDims.w, cltDims.h);
    }
  }

  y = 70;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PROGRAMA", pageW / 2, y, { align: "center" });
  y += 7;
  doc.text("RECTORES LÍDERES TRANSFORMADORES", pageW / 2, y, { align: "center" });
  y += 7;
  doc.text("COORDINADORES LÍDERES TRANSFORMADORES", pageW / 2, y, { align: "center" });

  y += 25;
  doc.setFontSize(24);
  doc.setTextColor(60, 60, 60);
  doc.text("Encuesta de", pageW / 2, y, { align: "center" });
  y += 12;
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text("Ambiente Escolar", pageW / 2, y, { align: "center" });

  y += 20;
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  doc.text("INFORME DE RESULTADOS", pageW / 2, y, { align: "center" });

  // Institution name on blue background
  y += 20;
  const boxH = 18;
  doc.setFillColor(26, 58, 107);
  doc.rect(margin, y, contentW, boxH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const instLines = doc.splitTextToSize(data.institucion, contentW - 10);
  const instY = y + (boxH - instLines.length * 6) / 2 + 5;
  doc.text(instLines, pageW / 2, instY, { align: "center" });

  y += boxH + 10;
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  if (data.entidadTerritorial) {
    doc.text(`ENTIDAD TERRITORIAL: ${data.entidadTerritorial}`, pageW / 2, y, { align: "center" });
  }

  // Cosmo logo at bottom
  const cosmoHCover = 12;
  const cosmoWCover = cosmoHCover * (cosmoSize.width / cosmoSize.height);
  if (cosmoB64) {
    doc.addImage(cosmoB64, "PNG", (pageW - cosmoWCover) / 2, pageH - 30, cosmoWCover, cosmoHCover);
  }

  // ════════════════════════════════════════════════════════════
  // PAGE 2 — EXPLANATORY (page 1 of 2)
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageNum++;
  drawPageHeader();

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 58, 107);
  doc.text("ENCUESTA DE AMBIENTE ESCOLAR", pageW / 2, y, { align: "center" });
  y += 10;

  // Render the full intro text
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  const introParas = REPORT_INTRO_TEXT.split("\n\n");
  for (const para of introParas) {
    const lines = wrapText(para.trim(), contentW, 8.5);
    if (y + lines.length * 3.8 > bottomLimit) {
      drawPageFooter(pageNum);
      doc.addPage();
      pageNum++;
      drawPageHeader();
    }
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(lines, margin, y);
    y += lines.length * 3.8 + 4;
  }

  drawPageFooter(pageNum);

  // ════════════════════════════════════════════════════════════
  // PAGE 3 — EXPLANATORY (page 2 of 2)
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageNum++;
  drawPageHeader();

  const page3Paras = REPORT_INTRO_TEXT_PAGE3.split("\n\n");
  for (const para of page3Paras) {
    const lines = wrapText(para.trim(), contentW, 8.5);
    if (y + lines.length * 3.8 > bottomLimit) {
      drawPageFooter(pageNum);
      doc.addPage();
      pageNum++;
      drawPageHeader();
    }
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(lines, margin, y);
    y += lines.length * 3.8 + 4;
  }

  drawPageFooter(pageNum);

  // ════════════════════════════════════════════════════════════
  // PAGE 4 — ENCUESTADOS (Demographics)
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageNum++;
  drawPageHeader();

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 58, 107);
  doc.text("ENCUESTADOS", margin, y);
    y += 6;

  const pieColors = ["#2196F3", "#FF9800", "#4CAF50", "#9C27B0", "#F44336", "#607D8B", "#795548", "#009688", "#E91E63", "#3F51B5", "#CDDC39", "#FF5722", "#00BCD4", "#8BC34A"];

  for (const role of ROLES) {
    const count = roleCounts[role];
    const color = ROLE_COLORS[role];
    const roleSubs = data.submissions.filter((s) => s.tipo_formulario === role);

    ensureSpace(15);
    // Role header bar
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(margin, y, contentW, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${ROLE_LABELS[role]}:  ${count} encuestados`, pageW / 2, y + 5.5, { align: "center" });
    y += 12;

    if (count === 0) {
      // Show empty chart placeholders
      if (role === "docentes") {
        drawEmptyDemoSection(doc, margin, y, contentW, "¿En qué grados tiene clases?", "¿En qué jornada tiene clases?");
        y += 40;
        drawEmptyBarSection(doc, margin, y, contentW, "¿Cuántos años lleva en la IE?", ANOS_OPTIONS.map(a => a === "Más de 5" ? "6 o mas" : a === "1" ? "1 año" : a === "2" ? "2 años" : a === "3" ? "3 años" : a === "4" ? "4 años" : a === "5" ? "5 años" : a));
        y += 38;
      } else if (role === "estudiantes") {
        drawEmptyDemoSection(doc, margin, y, contentW, "¿En qué grado te encuentras?", "¿En qué jornada tiene clases?");
        y += 40;
        drawEmptyBarSection(doc, margin, y, contentW, "¿Cuántos años lleva en la IE?", ANOS_OPTIONS.map(a => a === "Más de 5" ? "6 o mas" : a === "1" ? "1 año" : a === "2" ? "2 años" : a === "3" ? "3 años" : a === "4" ? "4 años" : a === "5" ? "5 años" : a));
        y += 38;
      } else {
        // Acudientes
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        doc.text("¿En qué grado se encuentran los estudiantes que representa?", margin, y + 4);
        y += 12;
      }
      continue;
    }

    // ── DOCENTES demographics ──
    if (role === "docentes") {
      const halfW = contentW / 2 - 3;

      // Grados pie chart
      const gradosCounts: Record<string, number> = {};
      const gradoGroups = ["Preescolar", "Primaria", "Secundaria", "Media"];
      gradoGroups.forEach(g => gradosCounts[g] = 0);
      for (const sub of roleSubs) {
        const grados = sub.respuestas?.grados as string[] || [];
        for (const g of grados) {
          if (["Primera infancia", "Preescolar"].includes(g)) gradosCounts["Preescolar"]++;
          else if (["1°", "2°", "3°", "4°", "5°"].includes(g)) gradosCounts["Primaria"]++;
          else if (["6°", "7°", "8°", "9°"].includes(g)) gradosCounts["Secundaria"]++;
          else if (["10°", "11°", "12°"].includes(g)) gradosCounts["Media"]++;
        }
      }

      ensureSpace(45);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("¿En qué grados tiene clases?", margin + halfW / 2, y, { align: "center" });
      doc.text("¿En qué jornada tiene clases?", margin + halfW + 6 + halfW / 2, y, { align: "center" });
      y += 4;

      const gradoPieData = gradoGroups.map((g, i) => ({ label: g, value: gradosCounts[g], color: pieColors[i] }));
      const gradoPieUrl = drawPieChart(gradoPieData, 200);
      doc.addImage(gradoPieUrl, "PNG", margin, y, 30, 30);

      // Legend
      let ly = y + 2;
      for (const d of gradoPieData) {
        doc.setFillColor(d.color);
        doc.rect(margin + 33, ly, 3, 3, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        doc.text(d.label, margin + 38, ly + 2.5);
        ly += 5;
      }

      // Jornada pie chart
      const jornadaCounts: Record<string, number> = {};
      for (const sub of roleSubs) {
        const jornadas = sub.respuestas?.jornadas as string[] || [];
        const jornada = sub.respuestas?.jornada as string;
        const jornadaList = jornadas.length > 0 ? jornadas : (jornada ? [jornada] : []);
        for (const j of jornadaList) {
          jornadaCounts[j] = (jornadaCounts[j] || 0) + 1;
        }
      }
      const jornadaPieData = Object.entries(jornadaCounts).map(([label, value], i) => ({
        label, value, color: pieColors[(i + 4) % pieColors.length],
      }));
      const jornadaPieUrl = drawPieChart(jornadaPieData, 200);
      doc.addImage(jornadaPieUrl, "PNG", margin + halfW + 6, y, 30, 30);

      // Jornada legend
      ly = y + 2;
      for (const d of jornadaPieData) {
        doc.setFillColor(d.color);
        doc.rect(margin + halfW + 39, ly, 3, 3, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        doc.text(d.label, margin + halfW + 44, ly + 2.5);
        ly += 5;
      }

      y += 35;

      // Años en la IE (horizontal bars)
      ensureSpace(40);
      const anosLabels = ["Menos de 1", "1 año", "2 años", "3 años", "4 años", "5 años", "6 o mas"];
      const anosMap = ["Menos de 1", "1", "2", "3", "4", "5", "Más de 5"];
      const anosValues = anosMap.map(a => roleSubs.filter(s => s.respuestas?.anos_docente === a).length);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("¿Cuántos años lleva en la IE?", margin + halfW / 2, y, { align: "center" });

      // Retroalimentación
      doc.text("Usted recibe retroalimentación de", margin + halfW + 6 + halfW / 2, y, { align: "center" });
      y += 4;

      // Draw años bars inline
      const barStartY = y;
      for (let i = 0; i < anosLabels.length; i++) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        doc.text(anosLabels[i], margin + 28, y + 3, { align: "right" });
        const maxBarW = halfW - 40;
        const maxV = Math.max(...anosValues, 1);
        const bw = (anosValues[i] / maxV) * maxBarW;
        if (bw > 0) {
          doc.setFillColor(41, 98, 255);
          doc.rect(margin + 30, y, bw, 3.5, "F");
        }
        doc.setFontSize(7);
        doc.text(String(anosValues[i]), margin + 31 + bw, y + 3);
        y += 5;
      }

      // Retroalimentación bars (right column)
      const retroLabels = FUENTES_RETROALIMENTACION;
      const retroValues = retroLabels.map(f =>
        roleSubs.filter(s => {
          const fuentes = s.respuestas?.fuentes_retroalimentacion as string[] || [];
          return fuentes.includes(f);
        }).length
      );

      let ry = barStartY;
      const rxBase = margin + halfW + 6;
      for (let i = 0; i < retroLabels.length; i++) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        const label = retroLabels[i] === "Rector/a" ? "Rector" : retroLabels[i] === "Coordinador/a" ? "Coordinator" : retroLabels[i] === "Otros/a docentes" ? "Otros docentes" : retroLabels[i];
        doc.text(label, rxBase + 28, ry + 3, { align: "right" });
        const maxV2 = Math.max(...retroValues, 1);
        const bw2 = (retroValues[i] / maxV2) * (halfW - 40);
        if (bw2 > 0) {
          doc.setFillColor(41, 98, 255);
          doc.rect(rxBase + 30, ry, bw2, 3.5, "F");
        }
        doc.setFontSize(7);
        doc.text(String(retroValues[i]), rxBase + 31 + bw2, ry + 3);
        ry += 5;
      }

      y = Math.max(y, ry) + 6;
    }

    // ── ESTUDIANTES demographics ──
    else if (role === "estudiantes") {
      const thirdW = contentW / 3 - 2;

      ensureSpace(50);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("¿En qué grado te", margin + thirdW / 2, y, { align: "center" });
      doc.text("encuentras?", margin + thirdW / 2, y + 4, { align: "center" });
      doc.text("¿En qué jornada", margin + thirdW + 3 + thirdW / 2, y, { align: "center" });
      doc.text("tiene clases?", margin + thirdW + 3 + thirdW / 2, y + 4, { align: "center" });
      doc.text("¿Cuántos años lleva en la", margin + (thirdW + 3) * 2 + thirdW / 2, y, { align: "center" });
      doc.text("IE?", margin + (thirdW + 3) * 2 + thirdW / 2, y + 4, { align: "center" });
      y += 8;

      // Grado pie chart
      const gradoCountsEst: Record<string, number> = {};
      for (const sub of roleSubs) {
        const g = sub.respuestas?.grado as string || "Sin dato";
        gradoCountsEst[g] = (gradoCountsEst[g] || 0) + 1;
      }
      const gradoPieEst = Object.entries(gradoCountsEst).map(([label, value], i) => ({
        label, value, color: pieColors[i % pieColors.length],
      }));
      const gradoPieEstUrl = drawPieChart(gradoPieEst, 200);
      doc.addImage(gradoPieEstUrl, "PNG", margin, y, 28, 28);

      // Grado legend
      let ly2 = y + 1;
      for (const d of gradoPieEst) {
        if (ly2 > y + 28) break;
        doc.setFillColor(d.color);
        doc.rect(margin + 30, ly2, 2.5, 2.5, "F");
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        doc.text(d.label, margin + 34, ly2 + 2);
        ly2 += 4;
      }

      // Jornada pie chart
      const jornadaCountsEst: Record<string, number> = {};
      for (const sub of roleSubs) {
        const j = sub.respuestas?.jornada as string || "Sin dato";
        jornadaCountsEst[j] = (jornadaCountsEst[j] || 0) + 1;
      }
      const jornadaPieEst = Object.entries(jornadaCountsEst).map(([label, value], i) => ({
        label, value, color: pieColors[(i + 4) % pieColors.length],
      }));
      const jornadaPieEstUrl = drawPieChart(jornadaPieEst, 200);
      doc.addImage(jornadaPieEstUrl, "PNG", margin + thirdW + 3, y, 28, 28);

      ly2 = y + 1;
      for (const d of jornadaPieEst) {
        if (ly2 > y + 28) break;
        doc.setFillColor(d.color);
        doc.rect(margin + thirdW + 33, ly2, 2.5, 2.5, "F");
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        doc.text(d.label, margin + thirdW + 37, ly2 + 2);
        ly2 += 4;
      }

      // Años bars
      const anosLabelsEst = ["Menos de 1", "1 año", "2 años", "3 años", "4 años", "5 años", "6 o mas"];
      const anosMapEst = ["Menos de 1", "1", "2", "3", "4", "5", "Más de 5"];
      const anosValuesEst = anosMapEst.map(a => roleSubs.filter(s => s.respuestas?.anos_estudiando === a).length);

      const rxEst = margin + (thirdW + 3) * 2;
      let ryEst = y;
      for (let i = 0; i < anosLabelsEst.length; i++) {
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        doc.text(anosLabelsEst[i], rxEst + 22, ryEst + 3, { align: "right" });
        const maxV = Math.max(...anosValuesEst, 1);
        const bw = (anosValuesEst[i] / maxV) * (thirdW - 30);
        if (bw > 0) {
          doc.setFillColor(255, 152, 0);
          doc.rect(rxEst + 24, ryEst, bw, 3, "F");
        }
        doc.setFontSize(6.5);
        doc.text(String(anosValuesEst[i]), rxEst + 25 + bw, ryEst + 3);
        ryEst += 4;
      }

      y += 35;
    }

    // ── ACUDIENTES demographics ──
    else if (role === "acudientes") {
      ensureSpace(35);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("¿En qué grado se encuentran los estudiantes que representa?", margin, y + 4);
      y += 8;

      // Grados pie chart
      const gradoGroupsAcu = ["Preescolar", "Primaria", "Secundaria", "Media"];
      const gradoCountsAcu: Record<string, number> = {};
      gradoGroupsAcu.forEach(g => gradoCountsAcu[g] = 0);
      for (const sub of roleSubs) {
        const grados = sub.respuestas?.grados as string[] || [];
        for (const g of grados) {
          if (["Primera infancia", "Preescolar"].includes(g)) gradoCountsAcu["Preescolar"]++;
          else if (["1°", "2°", "3°", "4°", "5°"].includes(g)) gradoCountsAcu["Primaria"]++;
          else if (["6°", "7°", "8°", "9°"].includes(g)) gradoCountsAcu["Secundaria"]++;
          else if (["10°", "11°", "12°"].includes(g)) gradoCountsAcu["Media"]++;
        }
      }

      const acuPieData = gradoGroupsAcu.map((g, i) => ({ label: g, value: gradoCountsAcu[g], color: pieColors[i] }));
      const hasAcuData = acuPieData.some(d => d.value > 0);
      if (hasAcuData) {
        const acuPieUrl = drawPieChart(acuPieData, 200);
        doc.addImage(acuPieUrl, "PNG", margin, y, 30, 30);

        let lyAcu = y + 2;
        for (const d of acuPieData) {
          doc.setFillColor(d.color);
          doc.rect(margin + 33, lyAcu, 3, 3, "F");
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(30, 30, 30);
          doc.text(`${d.label}: ${d.value}`, margin + 38, lyAcu + 2.5);
          lyAcu += 5;
        }
        y += 35;
      } else {
        y += 5;
      }
    }
  }

  // Highlighted note at bottom of Encuestados
  drawHighlightedNote(HELP_BOX_ENCUESTADOS);

  drawPageFooter(pageNum);

  // ════════════════════════════════════════════════════════════
  // RESUMEN GENERAL
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageNum++;
  drawPageHeader();

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 58, 107);
  doc.text("RESUMEN GENERAL", margin, y);
  y += 12;

  for (const role of ROLES) {
    ensureSpace(55);
    const color = ROLE_COLORS[role];
    const count = roleCounts[role];

    // Role header bar
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(margin, y, contentW, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(ROLE_LABELS[role], pageW / 2, y + 5, { align: "center" });
    y += 12;

    const barH = 10;
    const labelW = 55;
    const barW = contentW - labelW - 5;

    for (const sec of SECTION_NAMES) {
      const san = computeSAN(data.submissions, role, sec);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(sec, margin, y + barH / 2 + 1);

      if (count === 0 || san.total === 0) {
        // "Sin información" centered in bar area
        doc.setFillColor(230, 230, 230);
        doc.rect(margin + labelW, y, barW, barH, "F");
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(8);
        doc.text("Sin información", margin + labelW + barW / 2, y + barH / 2 + 1, { align: "center" });
      } else {
        let bx = margin + labelW;
        for (const key of ["S", "A", "N"] as SANKey[]) {
          const pct = san[key];
          const w = (pct / 100) * barW;
          if (w > 0) {
            const c = SAN_COLORS[key];
            doc.setFillColor(c[0], c[1], c[2]);
            doc.rect(bx, y, w, barH, "F");
            if (w > 10) {
              doc.setTextColor(255, 255, 255);
              doc.setFontSize(8);
              doc.setFont("helvetica", "bold");
              doc.text(`${pct}%`, bx + w / 2, y + barH / 2 + 1, { align: "center" });
            }
            bx += w;
          }
        }
      }

      y += barH + 5;
    }

    // Legend below bars
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    let lx = margin + labelW;
    for (const li of [{ key: "S" as SANKey, label: "Siempre/Casi siempre" }, { key: "A" as SANKey, label: "A veces" }, { key: "N" as SANKey, label: "Casi nunca/Nunca" }]) {
      const c = SAN_COLORS[li.key];
      doc.setFillColor(c[0], c[1], c[2]);
      doc.rect(lx, y - 1, 3, 3, "F");
      doc.setTextColor(30, 30, 30);
      doc.text(li.label, lx + 5, y + 1);
      lx += doc.getTextWidth(li.label) + 12;
    }
    y += 10;
  }

  // Help box
  drawHelpBox(HELP_BOX_RESUMEN);

  drawPageFooter(pageNum);

  // ════════════════════════════════════════════════════════════
  // FORTALEZAS Y RETOS — Unified table
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageNum++;
  drawPageHeader();

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 58, 107);
  doc.text("FORTALEZAS Y RETOS", margin, y);
  y += 8;

  // Help box
  drawHelpBox(HELP_BOX_FORTALEZAS);
  y += 2;

  // S/A/N legend
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  doc.text("S = Siempre / Casi Siempre", margin, y); y += 4;
  doc.text("A = A veces", margin, y); y += 4;
  doc.text("N = Nunca / Casi nunca", margin, y); y += 6;

  // Table dimensions
  const col0W = contentW * 0.34;
  const colGroupW = (contentW - col0W) / 3;
  const colSanW = colGroupW / 3;

  // Draw table header
  const drawUnifiedTableHeader = () => {
    // Role group headers
    let hx = margin + col0W;
    const topH = 5;
    for (const role of ROLES) {
      doc.setFillColor(220, 220, 220);
      doc.rect(hx, y, colGroupW, topH, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text(ROLE_LABELS[role].charAt(0) + ROLE_LABELS[role].slice(1).toLowerCase(), hx + colGroupW / 2, y + 3.5, { align: "center" });
      hx += colGroupW;
    }
    y += topH;

    // S/A/N sub-headers + "Item de la encuesta"
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, col0W, 5, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Item de la encuesta", margin + col0W / 2, y + 3.5, { align: "center" });

    hx = margin + col0W;
    for (const _role of ROLES) {
      doc.setFillColor(240, 240, 240);
      doc.rect(hx, y, colGroupW, 5, "F");
      for (let si = 0; si < 3; si++) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        doc.text(["S", "A", "N"][si], hx + si * colSanW + colSanW / 2, y + 3.5, { align: "center" });
      }
      hx += colGroupW;
    }
    y += 6;
  };

  drawUnifiedTableHeader();

  // Group items by section for the vertical section label
  let currentSection: SectionName | null = null;
  let sectionStartY = y;
  const sectionRanges: { section: string; startY: number; endY: number; page: number }[] = [];

  for (let itemIdx = 0; itemIdx < UNIFIED_REPORT_ITEMS.length; itemIdx++) {
    const item = UNIFIED_REPORT_ITEMS[itemIdx];

    // Detect section change
    if (item.section !== currentSection) {
      if (currentSection) {
        sectionRanges.push({ section: currentSection, startY: sectionStartY, endY: y, page: pageNum });
      }
      currentSection = item.section;
      sectionStartY = y;
    }

    const textLines = wrapText(item.reportText, col0W - 4, 6.5);
    const rowH = Math.max(10, textLines.length * 3 + 4);

    if (y + rowH > bottomLimit) {
      if (currentSection) {
        sectionRanges.push({ section: currentSection, startY: sectionStartY, endY: y, page: pageNum });
      }
      drawPageFooter(pageNum);
      doc.addPage();
      pageNum++;
      drawPageHeader();

      // S/A/N legend repeat
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text("S = Siempre / Casi Siempre", margin, y); y += 4;
      doc.text("A = A veces", margin, y); y += 4;
      doc.text("N = Nunca / Casi nunca", margin, y); y += 6;

      drawUnifiedTableHeader();
      sectionStartY = y;
    }

    // Alternating row background
    if (itemIdx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y, contentW, rowH, "F");
    }

    // Item text
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(textLines, margin + 2, y + 4);

    // S/A/N values per role
    let cx = margin + col0W;
    for (const role of ROLES) {
      const itemId = item[role as keyof typeof item] as string | undefined;
      if (itemId) {
        const san = computeItemSAN(data.submissions, role, itemId);
        const sanVals = [san.S, san.A, san.N];
        for (let si = 0; si < 3; si++) {
          const val = sanVals[si];
          const cellX = cx + si * colSanW;

          // Orange highlight if S < 50%
          if (si === 0 && val < 50 && san.total > 0) {
            doc.setFillColor(255, 165, 0);
            doc.rect(cellX, y, colSanW, rowH, "F");
            doc.setTextColor(255, 255, 255);
          } else {
            doc.setTextColor(30, 30, 30);
          }

          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          if (san.total > 0) {
            doc.text(`${val}%`, cellX + colSanW / 2, y + rowH / 2 + 1, { align: "center" });
          } else {
            doc.setTextColor(150, 150, 150);
            doc.setFontSize(6);
            doc.setFont("helvetica", "italic");
            doc.text("Sin", cellX + colSanW / 2, y + rowH / 2 - 1, { align: "center" });
            doc.text("datos", cellX + colSanW / 2, y + rowH / 2 + 2, { align: "center" });
          }
        }
      } else {
        for (let si = 0; si < 3; si++) {
          const cellX = cx + si * colSanW;
          doc.setTextColor(150, 150, 150);
          doc.setFontSize(6);
          doc.setFont("helvetica", "italic");
          doc.text("Sin", cellX + colSanW / 2, y + rowH / 2 - 1, { align: "center" });
          doc.text("datos", cellX + colSanW / 2, y + rowH / 2 + 2, { align: "center" });
        }
      }
      cx += colGroupW;
    }

    // Row border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.15);
    doc.line(margin, y + rowH, margin + contentW, y + rowH);

    y += rowH;
  }

  // Close last section range
  if (currentSection) {
    sectionRanges.push({ section: currentSection, startY: sectionStartY, endY: y, page: pageNum });
  }

  // Draw section labels vertically (on the left side) — we do this by going back to each page
  // Since jsPDF doesn't easily support going back to pages, we'll draw them inline.
  // The old PDF shows them as rotated text on the left. We'll skip this for simplicity
  // as jsPDF setPage + rotated text is complex. The table structure is faithful to the old format.

  y += 8;

  // ════════════════════════════════════════════════════════════
  // RETOS PARA EL DIRECTIVO EVALUADO (single block at end)
  // ════════════════════════════════════════════════════════════
  ensureSpace(55);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 58, 107);
  doc.text("RETOS PARA EL DIRECTIVO EVALUADO", margin, y);
  y += 6;

  // Help box for retos
  drawHelpBox(HELP_BOX_RETOS);
  y += 2;

  // Lined box for writing
  const retosH = Math.min(50, bottomLimit - y - 5);
  if (retosH > 10) {
    doc.setDrawColor(26, 58, 107);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentW, retosH);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.15);
    for (let ly = y + 8; ly < y + retosH - 2; ly += 7) {
      doc.line(margin + 3, ly, margin + contentW - 3, ly);
    }
    y += retosH;
  }

  drawPageFooter(pageNum);

  // ── Output ──
  if (options.returnBlob) {
    return doc.output("blob");
  }
  const safeName = data.institucion.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, "").replace(/\s+/g, "_");
  doc.save(`Informe_Ambiente_Escolar_${safeName}.pdf`);
}

// ── Helper: draw empty pie chart placeholders ──
function drawEmptyDemoSection(
  doc: jsPDF, x: number, y: number, contentW: number,
  title1: string, title2: string
) {
  const halfW = contentW / 2 - 3;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(title1, x + halfW / 2, y, { align: "center" });
  doc.text(title2, x + halfW + 6 + halfW / 2, y, { align: "center" });
}

function drawEmptyBarSection(
  doc: jsPDF, x: number, y: number, contentW: number,
  title: string, labels: string[]
) {
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(title, x + contentW / 4, y, { align: "center" });
  y += 4;
  for (const label of labels) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(label, x + 28, y + 3, { align: "right" });
    doc.text("0", x + 32, y + 3);
    y += 4.5;
  }
}
