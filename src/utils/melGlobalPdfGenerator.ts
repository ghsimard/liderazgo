import jsPDF from "jspdf";
import type { AggregatedMel } from "./melGlobalTypes";

// ── Design tokens ──
const C_BLACK: [number, number, number] = [25, 25, 25];
const C_DARK: [number, number, number] = [55, 55, 55];
const C_MID: [number, number, number] = [110, 110, 110];
const C_LIGHT_TEXT: [number, number, number] = [140, 140, 140];
const C_ACCENT: [number, number, number] = [38, 70, 83]; // teal-dark for headers
const C_ACCENT_LIGHT: [number, number, number] = [42, 157, 143]; // teal for positive
const C_WARN: [number, number, number] = [180, 60, 60];
const C_BG_LIGHT: [number, number, number] = [248, 248, 248];
const C_BG_CARD: [number, number, number] = [252, 252, 252];
const C_BORDER: [number, number, number] = [220, 220, 220];
const C_WHITE: [number, number, number] = [255, 255, 255];

function r1(n: number): string {
  return n.toFixed(2).replace(".", ",");
}
function deltaSign(n: number): string {
  return n > 0 ? `+${r1(n)}` : r1(n);
}
function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

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

function svgToDataUrl(svgEl: SVGSVGElement, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const styleEl = document.createElement("style");
    styleEl.textContent = `text { font-family: Helvetica, Arial, sans-serif; } .recharts-text { fill: #333; }`;
    clone.insertBefore(styleEl, clone.firstChild);
    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("SVG conversion failed")); };
    img.src = url;
  });
}

export interface MelGlobalPdfLogos {
  logoRLT: string;
  logoCLT: string;
}

export interface ChartCaptures {
  domainChartRef: React.RefObject<HTMLDivElement | null>;
  radarChartRef: React.RefObject<HTMLDivElement | null>;
  competencyChartRef: React.RefObject<HTMLDivElement | null>;
}

async function captureChartImage(ref: React.RefObject<HTMLDivElement | null>): Promise<string | null> {
  const el = ref.current;
  if (!el) return null;
  const svg = el.querySelector("svg.recharts-surface") as SVGSVGElement | null;
  if (!svg) return null;
  const rect = el.getBoundingClientRect();
  try {
    return await svgToDataUrl(svg, rect.width, rect.height);
  } catch {
    return null;
  }
}

// ── Utility draw helpers ──

function drawHRule(doc: jsPDF, x: number, y: number, w: number) {
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.line(x, y, x + w, y);
}

function drawSectionTitle(doc: jsPDF, text: string, x: number, y: number): number {
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_ACCENT);
  doc.text(text, x, y);
  return y + 2;
}

function drawSubtitle(doc: jsPDF, text: string, x: number, y: number): number {
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_LIGHT_TEXT);
  doc.text(text, x, y);
  return y + 5;
}

function getBarColor(val: number): [number, number, number] {
  if (val >= 80) return C_ACCENT_LIGHT;
  if (val >= 50) return [180, 140, 0];
  return C_WARN;
}

// ── Main export ──

export async function generarMelGlobalPDF(
  agg: AggregatedMel,
  logoSources: MelGlobalPdfLogos,
  charts: ChartCaptures,
  filterLabel: string,
): Promise<void> {
  const [domainImg, radarImg, compImg] = await Promise.all([
    captureChartImage(charts.domainChartRef),
    captureChartImage(charts.radarChartRef),
    captureChartImage(charts.competencyChartRef),
  ]);

  const [rltB64, cltB64, rltSize, cltSize] = await Promise.all([
    loadImageAsBase64(logoSources.logoRLT),
    loadImageAsBase64(logoSources.logoCLT),
    getImageNaturalSize(logoSources.logoRLT),
    getImageNaturalSize(logoSources.logoCLT),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 22;
  const contentW = pageW - margin * 2;

  const drawPageFooter = (pageNum: number) => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C_LIGHT_TEXT);
    doc.text("Programa RLT y CLT · Informe Global MEL", margin, pageH - 8);
    doc.text(String(pageNum), pageW - margin, pageH - 8, { align: "right" });
  };

  let pageNum = 1;

  // ═══════════════════════════════════════════
  // PAGE 1 — COVER
  // ═══════════════════════════════════════════
  const logoTargetH = 24;
  const rltW = (rltSize.width / rltSize.height) * logoTargetH;
  const cltW = (cltSize.width / cltSize.height) * logoTargetH;
  doc.addImage(rltB64, "PNG", margin, 28, rltW, logoTargetH);
  doc.addImage(cltB64, "PNG", pageW - margin - cltW, 28, cltW, logoTargetH);

  let y = 85;

  // Thin accent line
  doc.setDrawColor(...C_ACCENT);
  doc.setLineWidth(0.8);
  doc.line(pageW / 2 - 30, y, pageW / 2 + 30, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_MID);
  doc.text("PROGRAMA", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text("RECTORES LÍDERES TRANSFORMADORES", pageW / 2, y, { align: "center" });
  y += 6;
  doc.text("COORDINADORES LÍDERES TRANSFORMADORES", pageW / 2, y, { align: "center" });

  y += 25;
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_ACCENT);
  doc.text("Informe Global MEL", pageW / 2, y, { align: "center" });
  y += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_MID);
  doc.text("Monitoring, Evaluation & Learning", pageW / 2, y, { align: "center" });

  y += 25;
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_BLACK);
  doc.text(filterLabel || "Todos los directivos", pageW / 2, y, { align: "center" });

  // Stats card
  y += 18;
  const cardW = 130;
  const cardX = (pageW - cardW) / 2;
  doc.setFillColor(...C_BG_LIGHT);
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(cardX, y, cardW, 20, 3, 3, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_MID);
  const statsLine1 = `${agg.countBothPhases} de ${agg.countWithData} directivo(s) con datos en ambas fases`;
  const statsLine2 = `${agg.countPositiveAuto} con progresión positiva (ΔP ≥ 0,5)`;
  doc.text(statsLine1, pageW / 2, y + 8, { align: "center" });
  doc.text(statsLine2, pageW / 2, y + 14, { align: "center" });

  drawPageFooter(pageNum);

  // ═══════════════════════════════════════════
  // PAGE 2 — KPIs + INDICATOR AUTO
  // ═══════════════════════════════════════════
  doc.addPage();
  pageNum++;
  y = 22;

  y = drawSectionTitle(doc, "RESUMEN GLOBAL", margin, y);
  y += 6;

  // KPI cards in a row
  const kpiCount = 4;
  const kpiGap = 5;
  const kpiW = (contentW - (kpiCount - 1) * kpiGap) / kpiCount;
  const kpiH = 22;
  const kpis = [
    { label: "Directivos", value: String(agg.countWithData), sub: "con datos" },
    { label: "Δ Auto prom.", value: deltaSign(agg.avgDeltaAuto), sub: "autoevaluación" },
    { label: "Δ Obs. prom.", value: deltaSign(agg.avgDeltaObserver), sub: "observadores" },
    { label: "Progresión +", value: String(agg.countPositiveAuto), sub: `de ${agg.countBothPhases}` },
  ];
  kpis.forEach((kpi, i) => {
    const bx = margin + i * (kpiW + kpiGap);
    doc.setFillColor(...C_BG_CARD);
    doc.setDrawColor(...C_BORDER);
    doc.setLineWidth(0.25);
    doc.roundedRect(bx, y, kpiW, kpiH, 2, 2, "FD");
    // Top accent bar
    doc.setFillColor(...C_ACCENT);
    doc.rect(bx, y, kpiW, 1.2, "F");

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C_LIGHT_TEXT);
    doc.text(kpi.label.toUpperCase(), bx + kpiW / 2, y + 6, { align: "center" });
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C_BLACK);
    doc.text(kpi.value, bx + kpiW / 2, y + 14, { align: "center" });
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C_LIGHT_TEXT);
    doc.text(kpi.sub, bx + kpiW / 2, y + 19, { align: "center" });
  });
  y += kpiH + 12;

  // ── INDICATOR: AUTOEVALUACIÓN ──
  y = drawSectionTitle(doc, "INDICADOR MEL: AUTOEVALUACIÓN", margin, y);
  y = drawSubtitle(doc, "% de directivos con incremento (ΔP ≥ 0,5) · Meta: 80% · Línea base: 0%", margin, y);

  y = drawIndicatorBars(doc, {
    globalPct: agg.globalPctPositive,
    domainPcts: agg.domainIncrementPcts,
    countPositive: agg.countPositiveAuto,
    countTotal: agg.countBothPhases,
  }, margin, y, contentW, pageW);
  y += 4;

  // ── INDICATOR: OBSERVADORES ──
  if (y + 60 > pageH - 15) {
    drawPageFooter(pageNum);
    doc.addPage();
    pageNum++;
    y = 22;
  }

  y = drawSectionTitle(doc, "INDICADOR MEL: OBSERVADORES", margin, y);
  y = drawSubtitle(doc, "% de directivos con incremento (ΔP ≥ 0,5) según observadores · Meta: 80%", margin, y);

  y = drawIndicatorBars(doc, {
    globalPct: agg.globalPctPositiveObserver,
    domainPcts: agg.domainIncrementPctsObserver,
    countPositive: agg.countPositiveObs,
    countTotal: agg.countBothPhases,
  }, margin, y, contentW, pageW);

  drawPageFooter(pageNum);

  // ═══════════════════════════════════════════
  // PAGE 3 — CHARTS + DOMAIN TABLE
  // ═══════════════════════════════════════════
  doc.addPage();
  pageNum++;
  y = 22;

  if (domainImg) {
    y = drawSectionTitle(doc, "PROGRESIÓN POR DOMINIO", margin, y);
    y += 4;
    const imgH = 55;
    doc.addImage(domainImg, "PNG", margin, y, contentW, imgH);
    y += imgH + 8;
  }

  // Domain table
  if (y + 10 + agg.domainDeltas.length * 7 > pageH - 15) {
    drawPageFooter(pageNum);
    doc.addPage();
    pageNum++;
    y = 22;
  }
  y = drawSectionTitle(doc, "DELTAS PROMEDIO POR DOMINIO", margin, y);
  y += 4;
  y = drawDomainTable(doc, agg.domainDeltas, margin, y, contentW);

  drawPageFooter(pageNum);

  // ═══════════════════════════════════════════
  // PAGE 4 — RADAR + COMPETENCY CHART
  // ═══════════════════════════════════════════
  doc.addPage();
  pageNum++;
  y = 22;

  if (radarImg) {
    y = drawSectionTitle(doc, "COMPARACIÓN INICIAL VS FINAL", margin, y);
    y += 4;
    const radarH = 78;
    doc.addImage(radarImg, "PNG", margin + 12, y, contentW - 24, radarH);
    y += radarH + 10;
  }

  if (compImg) {
    if (y + 80 > pageH - 15) {
      drawPageFooter(pageNum);
      doc.addPage();
      pageNum++;
      y = 22;
    }
    y = drawSectionTitle(doc, "DELTAS POR COMPETENCIA", margin, y);
    y += 4;
    const compH = Math.min(88, pageH - y - 20);
    doc.addImage(compImg, "PNG", margin, y, contentW, compH);
    y += compH + 8;
  }

  drawPageFooter(pageNum);

  // ═══════════════════════════════════════════
  // PAGE 5 — COMPETENCY TABLE
  // ═══════════════════════════════════════════
  doc.addPage();
  pageNum++;
  y = 22;

  y = drawSectionTitle(doc, "DETALLE POR COMPETENCIA", margin, y);
  y += 4;

  const finalPageNum = drawCompetencyTable(doc, agg.competencyDeltas, margin, y, contentW, pageH, pageNum, drawPageFooter);
  drawPageFooter(finalPageNum);

  // Save
  const safeName = (filterLabel || "Global").replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, "").replace(/\s+/g, "_");
  doc.save(`MEL_Global_${safeName}.pdf`);
}

// ══════════════════════════════════════════════
// Indicator bars (shared for auto & observer)
// ══════════════════════════════════════════════
interface IndicatorData {
  globalPct: number;
  domainPcts: AggregatedMel["domainIncrementPcts"];
  countPositive: number;
  countTotal: number;
}

function drawIndicatorBars(
  doc: jsPDF, data: IndicatorData,
  margin: number, startY: number, contentW: number, pageW: number
): number {
  let y = startY;
  const barH = 5;
  const labelColW = 42;
  const barW = contentW - labelColW - 20;
  const barX = margin + labelColW;
  const targetX = barX + barW * 0.8;

  // Global bar
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text("Global", margin, y + barH / 2 + 1);

  // Background
  doc.setFillColor(...C_BG_LIGHT);
  doc.roundedRect(barX, y, barW, barH, 1.5, 1.5, "F");
  // Fill
  const fillW = Math.max(Math.min(data.globalPct, 100) / 100 * barW, 0.5);
  doc.setFillColor(...getBarColor(data.globalPct));
  doc.roundedRect(barX, y, fillW, barH, 1.5, 1.5, "F");
  // Value label
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text(pct(data.globalPct), barX + barW + 2, y + barH / 2 + 1);
  // Target line
  doc.setDrawColor(...C_DARK);
  doc.setLineDashPattern([1.5, 1], 0);
  doc.setLineWidth(0.3);
  doc.line(targetX, y - 1, targetX, y + barH + 1);
  doc.setLineDashPattern([], 0);

  y += barH + 4;

  // Domain bars
  for (const d of data.domainPcts) {
    const label = d.domainLabel.length > 28 ? d.domainLabel.substring(0, 26) + "…" : d.domainLabel;
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C_DARK);
    doc.text(label, margin, y + barH / 2 + 1);

    doc.setFillColor(...C_BG_LIGHT);
    doc.roundedRect(barX, y, barW, barH, 1.5, 1.5, "F");
    const dFillW = Math.max(Math.min(d.pctPositive, 100) / 100 * barW, 0.5);
    doc.setFillColor(...getBarColor(d.pctPositive));
    doc.roundedRect(barX, y, dFillW, barH, 1.5, 1.5, "F");

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C_MID);
    doc.text(pct(d.pctPositive), barX + barW + 2, y + barH / 2 + 1);

    doc.setDrawColor(...C_DARK);
    doc.setLineDashPattern([1.5, 1], 0);
    doc.setLineWidth(0.2);
    doc.line(targetX, y, targetX, y + barH);
    doc.setLineDashPattern([], 0);

    y += barH + 2.5;
  }

  // Summary line
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_LIGHT_TEXT);
  doc.text(`${data.countPositive} / ${data.countTotal} directivos con incremento`, margin, y + 2);
  y += 8;

  return y;
}

// ══════════════════════════════════════════════
// Domain table
// ══════════════════════════════════════════════
function drawDomainTable(
  doc: jsPDF,
  domains: AggregatedMel["domainDeltas"],
  x: number, y: number, w: number
): number {
  const cols = [w * 0.44, w * 0.28, w * 0.28];
  const rowH = 7;
  const headers = ["Dominio", "Δ Auto", "Δ Observadores"];

  // Header
  doc.setFillColor(...C_ACCENT);
  doc.roundedRect(x, y, w, rowH, 1.5, 1.5, "F");
  // Fill bottom corners to avoid gap with rows
  doc.rect(x, y + rowH - 2, w, 2, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_WHITE);
  let tx = x;
  headers.forEach((h, i) => {
    doc.text(h, i === 0 ? tx + 4 : tx + cols[i] / 2, y + rowH / 2 + 1, i === 0 ? {} : { align: "center" });
    tx += cols[i];
  });
  y += rowH;

  // Rows
  domains.forEach((d, i) => {
    doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 248);
    doc.rect(x, y, w, rowH, "F");
    // Bottom border
    doc.setDrawColor(...C_BORDER);
    doc.setLineWidth(0.15);
    doc.line(x, y + rowH, x + w, y + rowH);

    let cx = x;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C_BLACK);
    doc.text(d.domainLabel.substring(0, 42), cx + 4, y + rowH / 2 + 1);
    cx += cols[0];

    const obsAvg = (d.avgDeltaInternos + d.avgDeltaExternos) / 2;
    [d.avgDeltaAuto, obsAvg].forEach((val, vi) => {
      const color = val > 0 ? C_ACCENT_LIGHT : val < 0 ? C_WARN : C_MID;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...color);
      doc.text(deltaSign(val), cx + cols[vi + 1] / 2, y + rowH / 2 + 1, { align: "center" });
      cx += cols[vi + 1];
    });
    y += rowH;
  });

  return y + 4;
}

// ══════════════════════════════════════════════
// Competency detail table
// ══════════════════════════════════════════════
function drawCompetencyTable(
  doc: jsPDF,
  comps: AggregatedMel["competencyDeltas"],
  x: number, startY: number, w: number,
  pageH: number,
  startPageNum: number,
  drawPageFooter: (n: number) => void
): number {
  const cols = [w * 0.28, w * 0.12, w * 0.12, w * 0.12, w * 0.12, w * 0.12, w * 0.12];
  const headers = ["Competencia", "Ini Auto", "Fin Auto", "Δ Auto", "Ini Obs.", "Fin Obs.", "Δ Obs."];
  const rowH = 6;
  let pageNum = startPageNum;
  let y = startY;

  const drawHeader = () => {
    doc.setFillColor(...C_ACCENT);
    doc.roundedRect(x, y, w, rowH + 1, 1.5, 1.5, "F");
    doc.rect(x, y + rowH - 1, w, 2, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C_WHITE);
    let tx = x;
    headers.forEach((h, i) => {
      doc.text(h, i === 0 ? tx + 3 : tx + cols[i] / 2, y + rowH / 2 + 1, i === 0 ? {} : { align: "center" });
      tx += cols[i];
    });
    y += rowH + 1;
  };

  drawHeader();

  comps.forEach((c, i) => {
    if (y > pageH - 18) {
      drawPageFooter(pageNum);
      doc.addPage();
      pageNum++;
      y = 22;
      drawHeader();
    }

    doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 248);
    doc.rect(x, y, w, rowH, "F");
    doc.setDrawColor(...C_BORDER);
    doc.setLineWidth(0.1);
    doc.line(x, y + rowH, x + w, y + rowH);

    doc.setTextColor(...C_BLACK);
    doc.setFontSize(5.8);
    doc.setFont("helvetica", "normal");
    let tx = x;
    const label = c.competencyLabel.length > 30 ? c.competencyLabel.substring(0, 28) + "…" : c.competencyLabel;
    doc.text(label, tx + 3, y + rowH / 2 + 1);
    tx += cols[0];

    const vals = [c.avgInicialAuto, c.avgFinalAuto, c.avgDeltaAuto, c.avgInicialObs, c.avgFinalObs, c.avgDeltaObs];
    vals.forEach((v, vi) => {
      const isDelta = vi === 2 || vi === 5;
      const text = isDelta ? deltaSign(v) : r1(v);
      if (isDelta) {
        const color = v > 0 ? C_ACCENT_LIGHT : v < 0 ? C_WARN : C_MID;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...color);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C_BLACK);
      }
      doc.text(text, tx + cols[vi + 1] / 2, y + rowH / 2 + 1, { align: "center" });
      tx += cols[vi + 1];
    });
    y += rowH;
  });

  return pageNum;
}
