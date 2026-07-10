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

export interface MelIndicadorComponentPdf {
  title: string;
  deltaS: number | null;
  deltaN: number | null;
  cumple: boolean;
  evaluable: boolean;
}

export interface MelIndicadorRowPdf {
  institucion: string;
  nBase: number;
  nPost: number;
  variacionMuestralPct: number;
  comparable: boolean;
  componentsCumplen: number;
  cumple: boolean;
  components: MelIndicadorComponentPdf[];
}

export interface MelIndicadorPdf {
  meta: number;
  pctInstitucionesCumplen: number;
  nCumplen: number;
  nInstituciones: number;
  metaAlcanzada: boolean;
  nExcluidasMuestra: number;
  nNoEvaluables: number;
  ignorarComparabilidad: boolean;
  componentes: string[];
  porInstitucion: MelIndicadorRowPdf[];
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
  melIndicator?: MelIndicadorPdf;
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

  // Dynamic cohorte block: font size and box height adapt to the name length
  const drawCoverCohorteBlock = (
    startY: number,
    opts: { label: string; mainText: string; footerText: string; boxWidth: number }
  ): number => {
    const boxX = margin + 6;
    const boxW = opts.boxWidth;
    const innerPadY = 4;
    const labelSize = 8;
    const footerSize = 9;
    // Single cohorte keeps the original 16 pt look; multiple cohortes are scaled down
    const isMultiple = opts.mainText.includes(",");
    const mainMaxSize = isMultiple ? 14 : 16;
    const mainMinSize = 10;
    const maxTextWidth = boxW - 24; // 6 mm left + 6 mm right inner padding
    const lineHeight = (size: number) => size * 0.4; // mm

    // Choose the largest font size that keeps the cohorte name readable and compact.
    // For multiple cohortes we prefer 1 line; for a single cohorte we also prefer 1 line.
    // If 1 line cannot be achieved at the minimum size, we allow up to 2 lines.
    let mainSize = mainMaxSize;
    let mainLines: string[] = [];
    for (let targetLines = 1; targetLines <= 2; targetLines++) {
      for (let size = mainMaxSize; size >= mainMinSize; size--) {
        doc.setFontSize(size);
        const lines = doc.splitTextToSize(opts.mainText, maxTextWidth);
        if (lines.length <= targetLines) {
          mainSize = size;
          mainLines = lines;
          break;
        }
      }
      if (mainLines.length > 0) break;
    }
    if (mainLines.length === 0) {
      doc.setFontSize(mainMinSize);
      mainLines = doc.splitTextToSize(opts.mainText, maxTextWidth).slice(0, 2);
      mainSize = mainMinSize;
    }
    if (mainLines.length > 2) mainLines = mainLines.slice(0, 2);

    const mainLineHeight = lineHeight(mainSize);
    const labelMainGap = 3;
    const mainFooterGap = 4;

    // Block height computed from baselines, adding half-line descender padding
    const blockHeight =
      innerPadY * 2 +
      labelSize * 0.5 +
      labelMainGap +
      mainSize * 0.2 +
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

  const abbrev = (s: string) => {
    if (s.length <= 4) return s;
    const map: Record<string, string> = {
      "Comunicación": "Com.",
      "Prácticas Pedagógicas": "Ped.",
      "Convivencia": "Conv.",
    };
    return map[s] || s.slice(0, 4) + ".";
  };


  if (data.melIndicator && data.melIndicator.porInstitucion.length > 0) {
    const mel = data.melIndicator;
    doc.addPage();
    drawPageHeaderLogos(doc, logos, { margin, pageW });
    y = CONTENT_START_Y;
    y = drawSectionTitle(doc, {
      margin, pageW, y,
      title: "Indicador MEL — Ambiente Escolar",
      eyebrow: "Resultado oficial",
    });

    // 3 KPI cards
    const melGap = 4;
    const melKpiW = (contentW - melGap * 2) / 3;
    const melKpiH = 28;
    drawKpiCard(doc, {
      x: margin, y, w: melKpiW, h: melKpiH,
      label: "Instituciones que cumplen",
      value: `${mel.pctInstitucionesCumplen.toFixed(1)}%`,
      sublabel: `${mel.nCumplen} / ${mel.nInstituciones}`,
      valueColor: PALETTE.primary,
    });
    drawKpiCard(doc, {
      x: margin + melKpiW + melGap, y, w: melKpiW, h: melKpiH,
      label: "Meta",
      value: `${mel.meta}%`,
      sublabel: mel.metaAlcanzada ? "Alcanzada" : `Falta ${(mel.meta - mel.pctInstitucionesCumplen).toFixed(1)} pp`,
      valueColor: mel.metaAlcanzada ? PALETTE.primary : PALETTE.neutral,
    });
    drawKpiCard(doc, {
      x: margin + (melKpiW + melGap) * 2, y, w: melKpiW, h: melKpiH,
      label: "Excluidas",
      value: `${mel.nExcluidasMuestra + mel.nNoEvaluables}`,
      sublabel: `${mel.nExcluidasMuestra} muestra · ${mel.nNoEvaluables} sin datos`,
      valueColor: PALETTE.neutral,
    });
    y += melKpiH + 8;

    // Methodology note
    setText(doc, PALETTE.text);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    const notaLines = doc.splitTextToSize(
      "Metodología: para cada institución y componente, se calcula ΔS = %(Siempre + Casi siempre)_post − _base y ΔN = %(Nunca + Casi nunca)_post − _base. Una componente cumple si ΔS ≥ +5 pp o ΔN ≤ −5 pp. Una institución cumple si al menos 2 de las 3 componentes cumplen. Se exige comparabilidad muestral (variación entre base y post ≤ 10 %).",
      contentW,
    );
    ensureSpace(notaLines.length * 4 + 4);
    doc.text(notaLines, margin, y);
    y += notaLines.length * 4 + 4;

    // Table: 1 title col + N base + N post + Var + (ΔS + ΔN per componente) + Cumple
    const compTitles = mel.componentes;
    const melCols = [
      { label: "Institución", width: contentW * 0.28 },
      { label: "N base", width: contentW * 0.07, align: "right" as const },
      { label: "N post", width: contentW * 0.07, align: "right" as const },
      { label: "Var. %", width: contentW * 0.07, align: "right" as const },
      ...compTitles.flatMap((c) => [
        { label: `${abbrev(c)} ΔS`, width: (contentW * 0.42) / (compTitles.length * 2), align: "right" as const },
        { label: `${abbrev(c)} ΔN`, width: (contentW * 0.42) / (compTitles.length * 2), align: "right" as const },
      ]),
      { label: "Cumple", width: contentW * 0.09, align: "right" as const },
    ];
    y = drawTableHeader(doc, { x: margin, y, w: contentW, cols: melCols });
    for (let i = 0; i < mel.porInstitucion.length; i++) {
      const r = mel.porInstitucion[i];
      ensureSpace(8);
      const cells: any[] = [
        { text: r.institucion, bold: true, color: r.comparable ? PALETTE.text : PALETTE.textMuted },
        { text: String(r.nBase), align: "right" },
        { text: String(r.nPost), align: "right" },
        { text: `${r.variacionMuestralPct.toFixed(1)}`, align: "right", color: r.comparable ? PALETTE.text : PALETTE.neutral },
      ];
      for (const c of r.components) {
        const sOk = c.deltaS !== null && c.deltaS >= 5;
        const nOk = c.deltaN !== null && c.deltaN <= -5;
        cells.push({
          text: c.deltaS === null ? "—" : `${c.deltaS > 0 ? "+" : ""}${c.deltaS.toFixed(1)}`,
          align: "right",
          color: sOk ? PALETTE.primary : PALETTE.textMuted,
          bold: sOk,
        });
        cells.push({
          text: c.deltaN === null ? "—" : `${c.deltaN > 0 ? "+" : ""}${c.deltaN.toFixed(1)}`,
          align: "right",
          color: nOk ? PALETTE.primary : PALETTE.textMuted,
          bold: nOk,
        });
      }
      cells.push({
        text: r.cumple ? `✓ ${r.componentsCumplen}/3` : `✗ ${r.componentsCumplen}/3`,
        align: "right",
        color: r.cumple ? PALETTE.primary : PALETTE.neutral,
        bold: true,
      });
      y = drawTableRow(doc, { x: margin, y, w: contentW, cols: melCols, zebra: i % 2 === 0, cells });
    }
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
    y += 2;

    renderAnalysisHtml(doc, data.analysisHtml, {
      margin,
      contentW,
      getY: () => y,
      setY: (v) => { y = v; },
      ensureSpace,
    });
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

// ─── HTML → PDF renderer for the "Análisis automatizado" section ───
// Supports: h1/h2/h3, p, ul/ol/li, strong/b, em/i, br, hr.
// Falls back to a plain-text paragraph rendering when the input is not HTML.
type InlineRun = { text: string; bold: boolean; italic: boolean };

function parseInlineRuns(html: string): InlineRun[] {
  // Normalise inline tags and entities, keep bold/italic state per run.
  const tokens = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .split(/(<\/?(?:strong|b|em|i)>)/gi);

  const runs: InlineRun[] = [];
  let bold = false;
  let italic = false;
  for (const t of tokens) {
    if (!t) continue;
    const m = t.match(/^<(\/?)(strong|b|em|i)>$/i);
    if (m) {
      const close = m[1] === "/";
      const tag = m[2].toLowerCase();
      if (tag === "strong" || tag === "b") bold = !close;
      else italic = !close;
      continue;
    }
    // Strip any remaining unknown tags
    const clean = t.replace(/<[^>]+>/g, "");
    if (!clean) continue;
    runs.push({ text: clean, bold, italic });
  }
  return runs;
}

function fontStyleFor(bold: boolean, italic: boolean): "normal" | "bold" | "italic" | "bolditalic" {
  if (bold && italic) return "bolditalic";
  if (bold) return "bold";
  if (italic) return "italic";
  return "normal";
}

function drawInlineRuns(
  doc: jsPDF,
  runs: InlineRun[],
  opts: {
    x: number; maxWidth: number; fontSize: number; lineHeight: number;
    getY: () => number; setY: (y: number) => void;
    ensureSpace: (need: number) => void;
    color: [number, number, number];
  }
) {
  doc.setFontSize(opts.fontSize);
  setText(doc, opts.color);
  let cx = opts.x;
  const startX = opts.x;
  const spaceWidth = (bold: boolean, italic: boolean) => {
    doc.setFont("helvetica", fontStyleFor(bold, italic));
    return doc.getTextWidth(" ");
  };

  // Break each run into words while preserving explicit "\n"
  type Word = { text: string; bold: boolean; italic: boolean; forceBreak: boolean };
  const words: Word[] = [];
  for (const r of runs) {
    const parts = r.text.split(/(\n)/);
    for (const part of parts) {
      if (part === "\n") {
        words.push({ text: "", bold: r.bold, italic: r.italic, forceBreak: true });
        continue;
      }
      const chunks = part.split(/(\s+)/);
      for (const c of chunks) {
        if (!c) continue;
        if (/^\s+$/.test(c)) {
          if (words.length && !words[words.length - 1].forceBreak) {
            words.push({ text: " ", bold: r.bold, italic: r.italic, forceBreak: false });
          }
        } else {
          words.push({ text: c, bold: r.bold, italic: r.italic, forceBreak: false });
        }
      }
    }
  }

  const newLine = () => {
    opts.setY(opts.getY() + opts.lineHeight);
    opts.ensureSpace(opts.lineHeight);
    cx = startX;
  };

  opts.ensureSpace(opts.lineHeight);

  for (const w of words) {
    if (w.forceBreak) { newLine(); continue; }
    if (w.text === " ") {
      if (cx === startX) continue; // no leading space
      cx += spaceWidth(w.bold, w.italic);
      continue;
    }
    doc.setFont("helvetica", fontStyleFor(w.bold, w.italic));
    const wWidth = doc.getTextWidth(w.text);
    if (cx + wWidth > startX + opts.maxWidth && cx > startX) {
      newLine();
    }
    // Word longer than line: hard-wrap character by character
    if (wWidth > opts.maxWidth) {
      let buf = "";
      for (const ch of w.text) {
        const nextW = doc.getTextWidth(buf + ch);
        if (cx + nextW > startX + opts.maxWidth) {
          doc.text(buf, cx, opts.getY());
          newLine();
          buf = ch;
        } else {
          buf += ch;
        }
      }
      if (buf) {
        doc.text(buf, cx, opts.getY());
        cx += doc.getTextWidth(buf);
      }
    } else {
      doc.text(w.text, cx, opts.getY());
      cx += wWidth;
    }
  }
}

function renderAnalysisHtml(
  doc: jsPDF,
  html: string,
  opts: {
    margin: number; contentW: number;
    getY: () => number; setY: (y: number) => void;
    ensureSpace: (need: number) => void;
  }
) {
  const looksLikeHtml = /<\/?(p|h[1-6]|ul|ol|li|strong|b|em|i|br|hr|div)\b/i.test(html);

  // Fallback: plain text with double-newline paragraphs
  if (!looksLikeHtml) {
    const text = stripHtml(html);
    setText(doc, PALETTE.text);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    for (const p of text.split(/\n\n+/)) {
      if (!p.trim()) continue;
      const lines = doc.splitTextToSize(p.trim(), opts.contentW);
      opts.ensureSpace(lines.length * 5 + 4);
      doc.text(lines, opts.margin, opts.getY());
      opts.setY(opts.getY() + lines.length * 5 + 4);
    }
    return;
  }

  // Extract block-level elements in document order.
  const blockRe = /<(h[1-3]|p|ul|ol|hr)(\s[^>]*)?>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;
  let m: RegExpExecArray | null;
  let lastIndex = 0;
  const blocks: { tag: string; inner: string }[] = [];
  while ((m = blockRe.exec(html)) !== null) {
    if (m.index > lastIndex) {
      const stray = html.slice(lastIndex, m.index).trim();
      if (stray) blocks.push({ tag: "p", inner: stray });
    }
    const tag = (m[1] || "hr").toLowerCase();
    blocks.push({ tag, inner: m[3] ?? "" });
    lastIndex = blockRe.lastIndex;
  }
  if (lastIndex < html.length) {
    const stray = html.slice(lastIndex).trim();
    if (stray) blocks.push({ tag: "p", inner: stray });
  }
  if (blocks.length === 0) blocks.push({ tag: "p", inner: html });

  for (const b of blocks) {
    if (b.tag === "hr") {
      opts.ensureSpace(6);
      setDraw(doc, PALETTE.border);
      doc.setLineWidth(0.3);
      doc.line(opts.margin, opts.getY(), opts.margin + opts.contentW, opts.getY());
      doc.setLineWidth(0.2);
      opts.setY(opts.getY() + 4);
      continue;
    }

    if (b.tag === "h1" || b.tag === "h2" || b.tag === "h3") {
      const sizes: Record<string, number> = { h1: 14, h2: 12, h3: 11 };
      const size = sizes[b.tag];
      const runs = parseInlineRuns(b.inner).map(r => ({ ...r, bold: true }));
      opts.setY(opts.getY() + (b.tag === "h1" ? 4 : 3));
      opts.ensureSpace(size * 0.5 + 4);
      drawInlineRuns(doc, runs, {
        x: opts.margin,
        maxWidth: opts.contentW,
        fontSize: size,
        lineHeight: size * 0.5,
        getY: opts.getY,
        setY: opts.setY,
        ensureSpace: opts.ensureSpace,
        color: PALETTE.primary,
      });
      opts.setY(opts.getY() + 3);
      continue;
    }

    if (b.tag === "ul" || b.tag === "ol") {
      const itemRe = /<li(?:\s[^>]*)?>([\s\S]*?)<\/li>/gi;
      let li: RegExpExecArray | null;
      let index = 1;
      const bulletIndent = 5;
      const textIndent = opts.margin + bulletIndent;
      const bulletW = opts.contentW - bulletIndent;
      while ((li = itemRe.exec(b.inner)) !== null) {
        const runs = parseInlineRuns(li[1]);
        opts.ensureSpace(6);
        // Bullet / number
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        setText(doc, PALETTE.accent);
        const marker = b.tag === "ol" ? `${index}.` : "•";
        doc.text(marker, opts.margin + 1, opts.getY());
        // Item text
        drawInlineRuns(doc, runs, {
          x: textIndent,
          maxWidth: bulletW,
          fontSize: 10,
          lineHeight: 5,
          getY: opts.getY,
          setY: opts.setY,
          ensureSpace: opts.ensureSpace,
          color: PALETTE.text,
        });
        opts.setY(opts.getY() + 3);
        index++;
      }
      opts.setY(opts.getY() + 1);
      continue;
    }

    // Default: paragraph
    const runs = parseInlineRuns(b.inner);
    if (runs.length === 0) continue;
    drawInlineRuns(doc, runs, {
      x: opts.margin,
      maxWidth: opts.contentW,
      fontSize: 10,
      lineHeight: 5,
      getY: opts.getY,
      setY: opts.setY,
      ensureSpace: opts.ensureSpace,
      color: PALETTE.text,
    });
    opts.setY(opts.getY() + 4);
  }
}
