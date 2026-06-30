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
import {
  PALETTE, setFill, setText, setDraw,
  deltaColor, fmtNum, fmtDate,
  drawCoverBand, drawSectionTitle, drawKpiCard, drawDeltaBadge,
  drawTableHeader, drawTableRow,
  drawLikertBar, drawLikertLegend,
} from "@/utils/ambienteDeltaPdfStyles";

export interface InstSection {
  title: string;
  ini: number | null;
  evo: number | null;
  delta: number | null;
}
export interface InstLikertItem {
  id: string;
  text: string;
  // counts ordered Nunca → Siempre (length 5)
  countsIni: number[];
  countsEvo: number[];
  avgIni: number | null;
  avgEvo: number | null;
  delta: number | null;
}
export interface InstGroupData {
  grupo: string; // docentes | estudiantes | acudientes
  countIni: number;
  countEvo: number;
  iniGlobal: number | null;
  evoGlobal: number | null;
  deltaGlobal: number | null;
  sections: InstSection[];
  likertItems: InstLikertItem[];
}

export interface InstitucionReportData {
  cohorteNombre: string;
  institucionNombre: string;
  fechaInicial?: string | null;
  fechaEvolucion?: string | null;
  maxScore: number;
  instIni: number | null;
  instEvo: number | null;
  instDelta: number | null;
  groups: InstGroupData[];
}

export interface AmbienteInstPdfLogos {
  logoRLT: string;
  logoCLT: string;
  logoCosmo: string;
  showLogoRLT: boolean;
  showLogoCLT: boolean;
}

export async function generarPDFAmbienteInstitucion(
  data: InstitucionReportData,
  logoSources: AmbienteInstPdfLogos,
  options?: { returnBlob?: boolean; filename?: string }
): Promise<Blob | void> {
  const logos: LoadedLogos = await loadPdfLogos(
    { logoRLT: logoSources.logoRLT, logoCLT: logoSources.logoCLT, logoCosmo: logoSources.logoCosmo },
    logoSources.showLogoRLT,
    logoSources.showLogoCLT,
  );

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = 0;

  const addFooter = (pageNum: number) => drawFooterCosmo(doc, logos, { margin, pageW, pageH, pageNum });
  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - CONTENT_BOTTOM_MARGIN) {
      addFooter(doc.getNumberOfPages());
      doc.addPage();
      drawPageHeaderLogos(doc, logos, { margin, pageW });
      y = CONTENT_START_Y;
    }
  };

  // ─── COVER ─────────────────────────────────────────────────
  drawCoverBand(doc, {
    pageW,
    title: "Informe por Institución",
    subtitle: "Ambiente Escolar - Inicial vs. Evolución",
  });

  y = 80;
  y = drawCoverLogos(doc, logos, { y, pageW, targetH: 22 }) + 14;

  setFill(doc, PALETTE.surface);
  setDraw(doc, PALETTE.border);
  doc.roundedRect(margin + 4, y, contentW - 8, 46, 3, 3, "FD");

  setText(doc, PALETTE.accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("INSTITUCIÓN EDUCATIVA", pageW / 2, y + 8, { align: "center" });

  setText(doc, PALETTE.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const instLines = doc.splitTextToSize(data.institucionNombre, contentW - 20);
  doc.text(instLines, pageW / 2, y + 16, { align: "center" });

  setDraw(doc, PALETTE.border);
  doc.line(margin + 14, y + 32, pageW - margin - 14, y + 32);

  setText(doc, PALETTE.textMuted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Cohorte:  ${data.cohorteNombre}`, pageW / 2, y + 40, { align: "center" });

  y += 61;

  const dc = deltaColor(data.instDelta);
  setText(doc, dc);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  const headline = data.instDelta === null
    ? "Sin datos"
    : `${data.instDelta > 0 ? "+" : ""}${data.instDelta.toFixed(2)} pt`;
  doc.text(headline, pageW / 2, y, { align: "center" });
  y += 6;
  setText(doc, PALETTE.textMuted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Variación de la institución (Evolución vs Inicial)", pageW / 2, y, { align: "center" });


  addFooter(1);

  // ─── SÍNTESIS ──────────────────────────────────────────────
  doc.addPage();
  drawPageHeaderLogos(doc, logos, { margin, pageW });
  y = CONTENT_START_Y;
  y = drawSectionTitle(doc, { margin, pageW, y, title: "Síntesis institucional", eyebrow: "Visión general" });

  const gap = 4;
  const kpiW = (contentW - gap * 2) / 3;
  const kpiH = 28;
  drawKpiCard(doc, { x: margin, y, w: kpiW, h: kpiH, label: "Inicial",
    value: fmtNum(data.instIni), sublabel: `/ ${data.maxScore}`, valueColor: PALETTE.neutral });
  drawKpiCard(doc, { x: margin + kpiW + gap, y, w: kpiW, h: kpiH, label: "Evolución",
    value: fmtNum(data.instEvo), sublabel: `/ ${data.maxScore}`, valueColor: PALETTE.primary });
  drawKpiCard(doc, { x: margin + (kpiW + gap) * 2, y, w: kpiW, h: kpiH, label: "Variación",
    value: data.instDelta === null ? "—" : `${data.instDelta > 0 ? "+" : ""}${data.instDelta.toFixed(2)}`,
    sublabel: "puntos", valueColor: deltaColor(data.instDelta) });
  y += kpiH + 8;

  setText(doc, PALETTE.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Promedios por grupo encuestado", margin, y);
  y += 5;

  const colCfg = [
    { label: "Grupo", width: contentW * 0.28 },
    { label: "N Ini", width: contentW * 0.10, align: "right" as const },
    { label: "N Evo", width: contentW * 0.10, align: "right" as const },
    { label: "Inicial", width: contentW * 0.14, align: "right" as const },
    { label: "Evolución", width: contentW * 0.14, align: "right" as const },
    { label: "Var.", width: contentW * 0.24, align: "right" as const },
  ];
  y = drawTableHeader(doc, { x: margin, y, w: contentW, cols: colCfg });
  for (let i = 0; i < data.groups.length; i++) {
    const g = data.groups[i];
    const grupoLabel = g.grupo.charAt(0).toUpperCase() + g.grupo.slice(1);
    const dLabel = g.deltaGlobal === null ? "—" : `${g.deltaGlobal > 0 ? "+" : ""}${g.deltaGlobal.toFixed(2)} pt`;
    y = drawTableRow(doc, {
      x: margin, y, w: contentW, cols: colCfg, zebra: i % 2 === 0,
      cells: [
        { text: grupoLabel, bold: true },
        { text: String(g.countIni), align: "right" },
        { text: String(g.countEvo), align: "right" },
        { text: `${fmtNum(g.iniGlobal)} / ${data.maxScore}`, align: "right", color: PALETTE.textMuted },
        { text: `${fmtNum(g.evoGlobal)} / ${data.maxScore}`, align: "right", color: PALETTE.primary, bold: true },
        { text: dLabel, align: "right", color: deltaColor(g.deltaGlobal), bold: true },
      ],
    });
  }

  // ─── DETALLE POR GRUPO + DISTRIBUCIÓN LIKERT ───────────────
  for (const g of data.groups) {
    if (g.countIni === 0 && g.countEvo === 0) continue;
    doc.addPage();
    drawPageHeaderLogos(doc, logos, { margin, pageW });
    y = CONTENT_START_Y;
    const grupoLabel = g.grupo.charAt(0).toUpperCase() + g.grupo.slice(1);
    y = drawSectionTitle(doc, { margin, pageW, y, title: `${grupoLabel}`, eyebrow: "Detalle por grupo" });

    // Group header bar
    setFill(doc, PALETTE.primary);
    doc.rect(margin, y, contentW, 11, "F");
    setText(doc, PALETTE.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${g.countIni} resp. Ini · ${g.countEvo} resp. Evo`, margin + 3, y + 7);
    drawDeltaBadge(doc, { x: margin + contentW - 3, y: y + 7, delta: g.deltaGlobal, align: "right" });
    y += 15;

    // Sections recap
    setText(doc, PALETTE.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Promedios por sección", margin, y);
    y += 4;
    const secCols = [
      { label: "Sección", width: contentW * 0.46 },
      { label: "Inicial", width: contentW * 0.16, align: "right" as const },
      { label: "Evolución", width: contentW * 0.18, align: "right" as const },
      { label: "Δ", width: contentW * 0.20, align: "right" as const },
    ];
    y = drawTableHeader(doc, { x: margin, y, w: contentW, cols: secCols });
    for (let i = 0; i < g.sections.length; i++) {
      ensureSpace(8);
      const sec = g.sections[i];
      const dLabel = sec.delta === null ? "—" : `${sec.delta > 0 ? "+" : ""}${sec.delta.toFixed(2)} pt`;
      y = drawTableRow(doc, {
        x: margin, y, w: contentW, cols: secCols, zebra: i % 2 === 0,
        cells: [
          { text: sec.title, bold: true },
          { text: `${fmtNum(sec.ini)} / ${data.maxScore}`, align: "right", color: PALETTE.textMuted },
          { text: `${fmtNum(sec.evo)} / ${data.maxScore}`, align: "right", color: PALETTE.primary, bold: true },
          { text: dLabel, align: "right", color: deltaColor(sec.delta), bold: true },
        ],
      });
    }
    y += 6;

    // Likert distribution
    ensureSpace(20);
    setText(doc, PALETTE.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Distribución Likert por ítem", margin, y);
    y += 4;
    drawLikertLegend(doc, { x: margin, y, w: contentW });
    y += 5;

    const barW = contentW * 0.62;
    const barH = 4;
    for (const item of g.likertItems) {
      // Item block: text (2-3 lines) + 2 bars + n/Δ
      const itemTextLines = doc.splitTextToSize(item.text, contentW - 4);
      const blockH = Math.max(itemTextLines.length * 3.5, 8) + barH * 2 + 6;
      ensureSpace(blockH + 4);

      // Item text
      setText(doc, PALETTE.text);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(itemTextLines, margin, y + 3);
      const textBlockH = itemTextLines.length * 3.5;
      let by = y + textBlockH + 2;

      // Ini bar
      setText(doc, PALETTE.textMuted);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("Ini", margin, by + 3);
      drawLikertBar(doc, { x: margin + 8, y: by, w: barW, h: barH, counts: item.countsIni, showLabels: true });
      const niIni = item.countsIni.reduce((a, b) => a + b, 0);
      setText(doc, PALETTE.textMuted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(`n=${niIni}  prom ${fmtNum(item.avgIni)}`, margin + 8 + barW + 3, by + 3);
      by += barH + 1.5;

      // Evo bar
      setText(doc, PALETTE.textMuted);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("Evo", margin, by + 3);
      drawLikertBar(doc, { x: margin + 8, y: by, w: barW, h: barH, counts: item.countsEvo, showLabels: true });
      const nEvo = item.countsEvo.reduce((a, b) => a + b, 0);
      const dLabel = item.delta === null ? "" : `Δ ${item.delta > 0 ? "+" : ""}${item.delta.toFixed(2)}`;
      setText(doc, deltaColor(item.delta));
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(`n=${nEvo}  prom ${fmtNum(item.avgEvo)}  ${dLabel}`, margin + 8 + barW + 3, by + 3);
      by += barH + 4;

      // Divider
      setDraw(doc, PALETTE.border);
      doc.setLineWidth(0.1);
      doc.line(margin, by, margin + contentW, by);
      y = by + 2;
    }
  }

  // ─── Footers ───
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i);
  }

  const safe = (s: string) => s.replace(/[^a-zA-Z0-9-_]+/g, "_").slice(0, 60);
  const filename = options?.filename || `Informe_Delta_${safe(data.institucionNombre)}.pdf`;
  if (options?.returnBlob) {
    return doc.output("blob");
  }
  doc.save(filename);
}
