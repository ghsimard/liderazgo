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
  deltaColor, fmtNum, fmtDate, stripHtml,
  drawCoverBand, drawSectionTitle, drawKpiCard, drawDeltaBadge,
  drawTableHeader, drawTableRow,
  NOTACION_PARAGRAPHS,
} from "@/utils/ambienteDeltaPdfStyles";

export interface DeltaSection {
  title: string;
  ini: number | null;
  evo: number | null;
  delta: number | null;
}

export interface DeltaGroup {
  grupo: string;
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
  institucionDeltas: InstitucionDeltaRow[];
  analysisHtml?: string;
  regionesLabel?: string;
}


export interface AmbienteDeltaPdfLogos {
  logoRLT: string;
  logoCLT: string;
  logoCosmo: string;
  showLogoRLT: boolean;
  showLogoCLT: boolean;
}

export async function generarPDFAmbienteDelta(
  data: AmbienteDeltaReportData,
  logoSources: AmbienteDeltaPdfLogos,
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

  // ─── COVER ─────────────────────────────────────────────────
  drawCoverBand(doc, {
    pageW,
    title: "Informe Comparativo",
    subtitle: "Ambiente Escolar - Inicial vs. Evolución",
  });

  y = 80;
  y = drawCoverLogos(doc, logos, { y, pageW, targetH: 24 }) + 18;

  // Dynamic cohorte block: font size and height adapt to the name length
  const drawCoverCohorteBlock = (
    startY: number,
    opts: { label: string; mainText: string; footerText: string; boxWidth: number }
  ): number => {
    const boxX = margin + 6;
    const boxW = opts.boxWidth;
    const innerPadY = 5;
    const labelSize = 8;
    const footerSize = 9;
    const mainMaxSize = 16;
    const mainMinSize = 10;
    const maxTextWidth = boxW - 24; // 6 mm left + 6 mm right inner padding
    const lineHeight = (size: number) => size * 0.4; // mm

    // Choose the largest font size that keeps the cohorte name within 3 lines
    let mainSize = mainMaxSize;
    let mainLines: string[] = [];
    for (let size = mainMaxSize; size >= mainMinSize; size--) {
      doc.setFontSize(size);
      mainLines = doc.splitTextToSize(opts.mainText, maxTextWidth);
      mainSize = size;
      if (mainLines.length <= 3) break;
    }
    if (mainLines.length > 3) mainLines = mainLines.slice(0, 3);

    const mainLineHeight = lineHeight(mainSize);
    const labelMainGap = 3; // visual gap between label and main text blocks
    const mainFooterGap = 5;

    // Block height computed from baselines, adding half-line descender padding
    const blockHeight =
      innerPadY * 2 +
      labelSize * 0.5 + // label occupies ~0.5 of its line height above/below baseline
      labelMainGap +
      mainSize * 0.2 + // main ascender allowance
      mainLines.length * mainLineHeight +
      mainFooterGap +
      lineHeight(footerSize);

    // Draw box
    setFill(doc, PALETTE.surface);
    setDraw(doc, PALETTE.border);
    doc.roundedRect(boxX, startY, boxW, blockHeight, 3, 3, "FD");

    // Label
    setText(doc, PALETTE.accent);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(labelSize);
    const labelBaseline = startY + innerPadY + labelSize * 0.3;
    doc.text(opts.label, pageW / 2, labelBaseline, { align: "center" });

    // Main text (centered, wrapped)
    setText(doc, PALETTE.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(mainSize);
    const mainBaseline = startY + innerPadY + labelSize * 0.5 + labelMainGap + mainSize * 0.2;
    mainLines.forEach((line, i) => {
      doc.text(line, pageW / 2, mainBaseline + i * mainLineHeight, { align: "center" });
    });

    // Separator line
    const separatorY = mainBaseline + mainLines.length * mainLineHeight + mainFooterGap / 2;
    setDraw(doc, PALETTE.border);
    doc.line(margin + 16, separatorY, pageW - margin - 16, separatorY);

    // Footer line
    setText(doc, PALETTE.textMuted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(footerSize);
    doc.text(opts.footerText, pageW / 2, separatorY + mainFooterGap, { align: "center" });

    return startY + blockHeight;
  };

  const cohorteLabel = data.cohorteNombre.split(",").length > 1 ? "COHORTES INSCRITAS" : "COHORTE";

  y = drawCoverCohorteBlock(y, {
    label: cohorteLabel,
    mainText: data.cohorteNombre,
    footerText: `Generado:  ${fmtDate(new Date().toISOString())}`,
    boxWidth: contentW - 12,
  });

  y += 15;

  // Regiones scope label (only when a specific subset is selected)
  if (data.regionesLabel && data.regionesLabel.trim()) {
    setText(doc, PALETTE.textMuted);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(`Regiones: ${data.regionesLabel}`, contentW - 20);
    doc.text(lines, pageW / 2, y, { align: "center" });
    y += lines.length * 4 + 4;
  }


  // Cohort headline
  const dc = deltaColor(data.cohortDelta);
  setText(doc, dc);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  const headline = data.cohortDelta === null
    ? "Sin datos"
    : `${data.cohortDelta > 0 ? "+" : ""}${data.cohortDelta.toFixed(2)} pt`;
  doc.text(headline, pageW / 2, y, { align: "center" });
  y += 7;
  setText(doc, PALETTE.textMuted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Variación global de la cohorte (Evolución vs Inicial)", pageW / 2, y, { align: "center" });


  addFooter(1);

  // ─── RESUMEN EJECUTIVO ─────────────────────────────────────
  doc.addPage();
  drawPageHeaderLogos(doc, logos, { margin, pageW });
  y = CONTENT_START_Y;
  y = drawSectionTitle(doc, { margin, pageW, y, title: "Resumen ejecutivo", eyebrow: "Visión general" });

  // 3 KPI cards
  const gap = 4;
  const kpiW = (contentW - gap * 2) / 3;
  const kpiH = 28;
  drawKpiCard(doc, {
    x: margin, y, w: kpiW, h: kpiH,
    label: "Inicial",
    value: fmtNum(data.cohortIni),
    sublabel: `/ ${data.maxScore}`,
    valueColor: PALETTE.neutral,
  });
  drawKpiCard(doc, {
    x: margin + kpiW + gap, y, w: kpiW, h: kpiH,
    label: "Evolución",
    value: fmtNum(data.cohortEvo),
    sublabel: `/ ${data.maxScore}`,
    valueColor: PALETTE.primary,
  });
  drawKpiCard(doc, {
    x: margin + (kpiW + gap) * 2, y, w: kpiW, h: kpiH,
    label: "Variación",
    value: data.cohortDelta === null ? "—" : `${data.cohortDelta > 0 ? "+" : ""}${data.cohortDelta.toFixed(2)}`,
    sublabel: "puntos",
    valueColor: deltaColor(data.cohortDelta),
  });
  y += kpiH + 8;

  // Per-grupo mini-summary
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
    const dLabel = g.deltaGlobal === null
      ? "—"
      : `${g.deltaGlobal > 0 ? "+" : ""}${g.deltaGlobal.toFixed(2)} pt`;
    y = drawTableRow(doc, {
      x: margin, y, w: contentW,
      cols: colCfg,
      zebra: i % 2 === 0,
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

  // ─── SISTEMA DE CALIFICACIÓN ───────────────────────────────
  doc.addPage();
  drawPageHeaderLogos(doc, logos, { margin, pageW });
  y = CONTENT_START_Y;
  y = drawSectionTitle(doc, { margin, pageW, y, title: "Sistema de calificación", eyebrow: "Metodología" });

  setText(doc, PALETTE.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const p of NOTACION_PARAGRAPHS) {
    const lines = doc.splitTextToSize(p, contentW);
    ensureSpace(lines.length * 5 + 4);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 4;
  }

  // ─── DETALLE POR GRUPO ─────────────────────────────────────
  for (const g of data.groups) {
    doc.addPage();
    drawPageHeaderLogos(doc, logos, { margin, pageW });
    y = CONTENT_START_Y;
    const grupoLabel = g.grupo.charAt(0).toUpperCase() + g.grupo.slice(1);
    y = drawSectionTitle(doc, { margin, pageW, y, title: `Detalle — ${grupoLabel}`, eyebrow: "Grupo encuestado" });

    // Group header bar
    setFill(doc, PALETTE.primary);
    doc.rect(margin, y, contentW, 11, "F");
    setText(doc, PALETTE.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${grupoLabel}  ·  ${g.countIni} resp. Ini · ${g.countEvo} resp. Evo`, margin + 3, y + 7);
    drawDeltaBadge(doc, { x: margin + contentW - 3, y: y + 7, delta: g.deltaGlobal, align: "right" });
    y += 14;

    // Promedios globales du grupo
    setText(doc, PALETTE.textMuted);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text(
      `Promedios globales del grupo: Inicial ${fmtNum(g.iniGlobal)} / ${data.maxScore}  →  Evolución ${fmtNum(g.evoGlobal)} / ${data.maxScore}`,
      margin, y
    );
    y += 6;

    // Sections table
    const secCols = [
      { label: "Sección", width: contentW * 0.46 },
      { label: "Inicial", width: contentW * 0.16, align: "right" as const },
      { label: "Evolución", width: contentW * 0.18, align: "right" as const },
      { label: "Var.", width: contentW * 0.20, align: "right" as const },
    ];
    y = drawTableHeader(doc, { x: margin, y, w: contentW, cols: secCols });
    for (let i = 0; i < g.sections.length; i++) {
      ensureSpace(8);
      const sec = g.sections[i];
      const dLabel = sec.delta === null
        ? "—"
        : `${sec.delta > 0 ? "+" : ""}${sec.delta.toFixed(2)} pt`;
      y = drawTableRow(doc, {
        x: margin, y, w: contentW,
        cols: secCols,
        zebra: i % 2 === 0,
        cells: [
          { text: sec.title, bold: true },
          { text: `${fmtNum(sec.ini)} / ${data.maxScore}`, align: "right", color: PALETTE.textMuted },
          { text: `${fmtNum(sec.evo)} / ${data.maxScore}`, align: "right", color: PALETTE.primary, bold: true },
          { text: dLabel, align: "right", color: deltaColor(sec.delta), bold: true },
        ],
      });
    }
  }

  // ─── VARIACIÓN POR INSTITUCIÓN ─────────────────────────────
  if (data.institucionDeltas.length > 0) {
    doc.addPage();
    drawPageHeaderLogos(doc, logos, { margin, pageW });
    y = CONTENT_START_Y;
    y = drawSectionTitle(doc, {
      margin, pageW, y,
      title: `Variación por institución (${data.institucionDeltas.length})`,
      eyebrow: "Comparativa institucional",
    });

    setText(doc, PALETTE.textMuted);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("Instituciones con respuestas en ambas fases. Ordenadas por variación descendente.", margin, y);
    y += 6;

    const instCols = [
      { label: "Institución", width: contentW * 0.40 },
      { label: "N Ini", width: contentW * 0.08, align: "right" as const },
      { label: "N Evo", width: contentW * 0.08, align: "right" as const },
      { label: "Inicial", width: contentW * 0.13, align: "right" as const },
      { label: "Evolución", width: contentW * 0.15, align: "right" as const },
      { label: "Var.", width: contentW * 0.16, align: "right" as const },
    ];

    y = drawTableHeader(doc, { x: margin, y, w: contentW, cols: instCols });
    for (let i = 0; i < data.institucionDeltas.length; i++) {
      ensureSpace(8);
      const r = data.institucionDeltas[i];
      const dLabel = r.delta === null
        ? "—"
        : `${r.delta > 0 ? "+" : ""}${r.delta.toFixed(2)}`;
      y = drawTableRow(doc, {
        x: margin, y, w: contentW,
        cols: instCols,
        zebra: i % 2 === 0,
        cells: [
          { text: r.institucion, bold: true },
          { text: String(r.countIni), align: "right" },
          { text: String(r.countEvo), align: "right" },
          { text: fmtNum(r.ini), align: "right", color: PALETTE.textMuted },
          { text: fmtNum(r.evo), align: "right", color: PALETTE.primary, bold: true },
          { text: dLabel, align: "right", color: deltaColor(r.delta), bold: true },
        ],
      });
    }
  }

  // ─── ANÁLISIS AUTOMATIZADO (only if present) ───────────────
  if (data.analysisHtml && data.analysisHtml.trim()) {
    doc.addPage();
    drawPageHeaderLogos(doc, logos, { margin, pageW });
    y = CONTENT_START_Y;
    y = drawSectionTitle(doc, { margin, pageW, y, title: "Análisis automatizado", eyebrow: "Interpretación" });

    setText(doc, PALETTE.text);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const text = stripHtml(data.analysisHtml);
    for (const p of text.split(/\n\n+/)) {
      if (!p.trim()) continue;
      const lines = doc.splitTextToSize(p.trim(), contentW);
      ensureSpace(lines.length * 5 + 4);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 4;
    }
  }

  // ─── Footers ───
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i);
  }

  const safeCohorte = data.cohorteNombre.replace(/[^a-zA-Z0-9-_]+/g, "_");
  const filename = options?.filename || `Informe_Delta_AmbienteEscolar_${safeCohorte}.pdf`;
  if (options?.returnBlob) {
    return doc.output("blob");
  }
  doc.save(filename);
}
