import jsPDF from "jspdf";
import type { AggregatedMel } from "./melGlobalTypes";

// ── Grayscale design tokens (monochrome print) ──
const C_BLACK: [number, number, number] = [30, 30, 30];
const C_DARK: [number, number, number] = [60, 60, 60];
const C_MID: [number, number, number] = [120, 120, 120];
const C_LIGHT: [number, number, number] = [170, 170, 170];
const C_SUBTLE: [number, number, number] = [200, 200, 200];
const C_BG: [number, number, number] = [240, 240, 240];
const C_STRIPE: [number, number, number] = [248, 248, 248];
const C_HEADER_BG: [number, number, number] = [50, 50, 50];
const C_WHITE: [number, number, number] = [255, 255, 255];

function r1(n: number): string {
  return n.toFixed(2).replace(".", ",");
}
function deltaSign(n: number): string {
  return n > 0 ? `+${r1(n)}` : r1(n);
}
function pctStr(n: number): string {
  return `${n.toFixed(1)}%`;
}

// ── Image helpers ──

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
  showRLT?: boolean;
  showCLT?: boolean;
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
  try { return await svgToDataUrl(svg, rect.width, rect.height); } catch { return null; }
}

// ── Section drawing helpers ──

function drawSectionTitle(doc: jsPDF, text: string, x: number, y: number): number {
  // Thin rule above title
  doc.setDrawColor(...C_SUBTLE);
  doc.setLineWidth(0.3);
  doc.line(x, y - 1, x + 60, y - 1);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text(text, x, y + 3);
  return y + 6;
}

function drawSubtitle(doc: jsPDF, text: string, x: number, y: number): number {
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_LIGHT);
  doc.text(text, x, y);
  return y + 5;
}

// ═══════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════

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

  const drawPageFooter = (pn: number) => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C_LIGHT);
    doc.text("Programa RLT y CLT · Informe Global MEL", margin, pageH - 8);
    doc.text(String(pn), pageW - margin, pageH - 8, { align: "right" });
  };

  let pageNum = 1;

  // ═══════════════════════════════════════════
  // PAGE 1 — COVER
  // ═══════════════════════════════════════════
  const showRLT = logoSources.showRLT !== false;
  const showCLT = logoSources.showCLT !== false;
  const logoTargetH = 24;
  const rltW = (rltSize.width / rltSize.height) * logoTargetH;
  const cltW = (cltSize.width / cltSize.height) * logoTargetH;
  if (showRLT) doc.addImage(rltB64, "PNG", margin, 28, rltW, logoTargetH);
  if (showCLT) doc.addImage(cltB64, "PNG", pageW - margin - cltW, 28, cltW, logoTargetH);

  let y = 82;
  doc.setDrawColor(...C_MID);
  doc.setLineWidth(0.5);
  doc.line(pageW / 2 - 28, y, pageW / 2 + 28, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_MID);
  doc.text("PROGRAMA", pageW / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text("RECTORES LÍDERES TRANSFORMADORES", pageW / 2, y, { align: "center" });
  y += 7;
  doc.text("COORDINADORES LÍDERES TRANSFORMADORES", pageW / 2, y, { align: "center" });

  y += 28;
  doc.setFontSize(26);
  doc.setTextColor(...C_DARK);
  doc.text("Informe Global MEL", pageW / 2, y, { align: "center" });
  y += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_MID);
  doc.text("Monitoring, Evaluation & Learning", pageW / 2, y, { align: "center" });

  y += 28;
  doc.setFontSize(13);
  doc.setTextColor(...C_BLACK);
  doc.text(filterLabel || "Todos los pares", pageW / 2, y, { align: "center" });

  y += 15;
  doc.setFontSize(8);
  doc.setTextColor(...C_MID);
  doc.text(
    `${agg.countBothPhases} de ${agg.countWithData} par(es) con datos en ambas fases · ${agg.countPositiveAuto} con progresión positiva (ΔP ≥ 0,5)`,
    pageW / 2, y, { align: "center" }
  );

  drawPageFooter(pageNum);

  // ═══════════════════════════════════════════
  // PAGE 2 — KPIs + INDICATORS
  // ═══════════════════════════════════════════
  doc.addPage();
  pageNum++;
  y = 22;

  y = drawSectionTitle(doc, "RESUMEN GLOBAL", margin, y);
  y += 4;

  // KPI row — simple bold numbers with label above
  const kpiGap = 4;
  const kpiW2 = (contentW - 3 * kpiGap) / 4;
  const kpis = [
    { label: "PARES", value: String(agg.countWithData) },
    { label: "Δ AUTO PROM.", value: deltaSign(agg.avgDeltaAuto) },
    { label: "Δ OBS. PROM.", value: deltaSign(agg.avgDeltaObserver) },
    { label: "PROGRESIÓN +", value: `${agg.countPositiveAuto} / ${agg.countBothPhases}` },
  ];
  kpis.forEach((kpi, i) => {
    const bx = margin + i * (kpiW2 + kpiGap);
    // Light bg box
    doc.setFillColor(...C_BG);
    doc.rect(bx, y, kpiW2, 18, "F");
    // Label
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C_MID);
    doc.text(kpi.label, bx + kpiW2 / 2, y + 5.5, { align: "center" });
    // Value
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C_BLACK);
    doc.text(kpi.value, bx + kpiW2 / 2, y + 14, { align: "center" });
  });
  y += 26;

  // ── INDICATOR: AUTOEVALUACIÓN ──
  y = drawSectionTitle(doc, "INDICADOR MEL: AUTOEVALUACIÓN", margin, y);
  y = drawSubtitle(doc, "% de pares con incremento (ΔP ≥ 0,5)", margin, y);

  y = drawBulletChart(doc, {
    globalPct: agg.globalPctPositive,
    domainPcts: agg.domainIncrementPcts,
    countPositive: agg.countPositiveAuto,
    countTotal: agg.countBothPhases,
  }, margin, y, contentW);
  y += 6;

  // ── INDICATOR: OBSERVADORES ──
  if (y + 55 > pageH - 15) {
    drawPageFooter(pageNum);
    doc.addPage();
    pageNum++;
    y = 22;
  }

  y = drawSectionTitle(doc, "INDICADOR MEL: OBSERVADORES", margin, y);
  y = drawSubtitle(doc, "% de pares con incremento (ΔP ≥ 0,5) según observadores", margin, y);

  y = drawBulletChart(doc, {
    globalPct: agg.globalPctPositiveObserver,
    domainPcts: agg.domainIncrementPctsObserver,
    countPositive: agg.countPositiveObs,
    countTotal: agg.countBothPhases,
  }, margin, y, contentW);

  drawPageFooter(pageNum);

  // ═══════════════════════════════════════════
  // PAGE 3 — CHARTS + DOMAIN TABLE
  // ═══════════════════════════════════════════
  doc.addPage();
  pageNum++;
  y = 22;

  if (domainImg) {
    y = drawSectionTitle(doc, "PROGRESIÓN POR DOMINIO", margin, y);
    y += 3;
    const imgH = 55;
    doc.addImage(domainImg, "PNG", margin, y, contentW, imgH);
    y += imgH + 8;
  }

  if (y + 10 + agg.domainDeltas.length * 7 > pageH - 15) {
    drawPageFooter(pageNum);
    doc.addPage();
    pageNum++;
    y = 22;
  }
  y = drawSectionTitle(doc, "DELTAS PROMEDIO POR DOMINIO", margin, y);
  y += 3;
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
    y += 3;
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
    y += 3;
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
  y += 3;

  const finalPageNum = drawCompetencyTable(doc, agg.competencyDeltas, margin, y, contentW, pageH, pageNum, drawPageFooter);
  drawPageFooter(finalPageNum);

  const safeName = (filterLabel || "Global").replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, "").replace(/\s+/g, "_");
  doc.save(`MEL_Global_${safeName}.pdf`);
}

// ═══════════════════════════════════════════════
// Bullet chart — clean monochrome indicator
// Stephen Few's bullet graph style adapted for print
// ═══════════════════════════════════════════════

interface IndicatorData {
  globalPct: number;
  domainPcts: AggregatedMel["domainIncrementPcts"];
  countPositive: number;
  countTotal: number;
}

function drawBulletChart(
  doc: jsPDF, data: IndicatorData,
  margin: number, startY: number, contentW: number
): number {
  let y = startY;
  const rowH = 7;
  const labelColW = 45;
  const valueColW = 16;
  const chartW = contentW - labelColW - valueColW;
  const chartX = margin + labelColW;
  const barH = 3.5;

  // Scale marks at 0%, 20%, 40%, 60%, 80%, 100%
  const drawScale = (atY: number) => {
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C_LIGHT);
    for (let p = 0; p <= 100; p += 20) {
      const sx = chartX + (p / 100) * chartW;
      doc.text(String(p), sx, atY, { align: "center" });
    }
  };

  // Draw scale at top
  drawScale(y);
  y += 3;

  // Helper to draw one bullet row
  const drawRow = (label: string, value: number, isBold: boolean) => {
    // Qualitative ranges (background bands): poor / satisfactory / good
    const bandH = rowH - 1;
    const bandY = y + 0.5;
    // Band 1: 0-50% light gray
    doc.setFillColor(230, 230, 230);
    doc.rect(chartX, bandY, chartW * 0.5, bandH, "F");
    // Band 2: 50-80% slightly darker
    doc.setFillColor(210, 210, 210);
    doc.rect(chartX + chartW * 0.5, bandY, chartW * 0.3, bandH, "F");
    // Band 3: 80-100% darker
    doc.setFillColor(190, 190, 190);
    doc.rect(chartX + chartW * 0.8, bandY, chartW * 0.2, bandH, "F");

    // Performance bar (solid black)
    const barWidth = Math.max(Math.min(value, 100) / 100 * chartW, 0.3);
    const barY = y + (rowH - barH) / 2;
    doc.setFillColor(...C_BLACK);
    doc.rect(chartX, barY, barWidth, barH, "F");

    // Target marker at 80% — vertical line
    const targetX = chartX + chartW * 0.8;
    doc.setDrawColor(...C_BLACK);
    doc.setLineWidth(0.6);
    doc.line(targetX, bandY - 0.5, targetX, bandY + bandH + 0.5);

    // Label
    doc.setFontSize(isBold ? 7 : 6.5);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setTextColor(...C_BLACK);
    doc.text(label, chartX - 3, y + rowH / 2 + 1, { align: "right" });

    // Value
    doc.setFontSize(6.5);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setTextColor(...C_DARK);
    doc.text(pctStr(value), chartX + chartW + 3, y + rowH / 2 + 1);

    y += rowH + 1;
  };

  // Global row
  drawRow("Global", data.globalPct, true);

  // Thin separator
  doc.setDrawColor(...C_SUBTLE);
  doc.setLineWidth(0.2);
  doc.line(chartX, y - 0.5, chartX + chartW, y - 0.5);
  y += 1;

  // Domain rows
  for (const d of data.domainPcts) {
    const label = d.domainLabel.length > 28 ? d.domainLabel.substring(0, 26) + "…" : d.domainLabel;
    drawRow(label, d.pctPositive, false);
  }

  // Summary
  y += 1;
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_MID);
  doc.text(`${data.countPositive} / ${data.countTotal} pares con incremento`, margin, y);
  y += 5;

  return y;
}

// ═══════════════════════════════════════════════
// Domain delta table
// ═══════════════════════════════════════════════

function drawDomainTable(
  doc: jsPDF,
  domains: AggregatedMel["domainDeltas"],
  x: number, y: number, w: number
): number {
  const cols = [w * 0.44, w * 0.28, w * 0.28];
  const rowH = 7;
  const headers = ["Dominio", "Δ Auto", "Δ Observadores"];

  // Header
  doc.setFillColor(...C_HEADER_BG);
  doc.rect(x, y, w, rowH, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_WHITE);
  let tx = x;
  headers.forEach((h, i) => {
    doc.text(h, i === 0 ? tx + 3 : tx + cols[i] / 2, y + rowH / 2 + 1, i === 0 ? {} : { align: "center" });
    tx += cols[i];
  });
  y += rowH;

  // Rows
  domains.forEach((d, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(...C_STRIPE);
      doc.rect(x, y, w, rowH, "F");
    }
    doc.setDrawColor(...C_SUBTLE);
    doc.setLineWidth(0.1);
    doc.line(x, y + rowH, x + w, y + rowH);

    let cx = x;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C_BLACK);
    doc.text(d.domainLabel.substring(0, 42), cx + 3, y + rowH / 2 + 1);
    cx += cols[0];

    const obsAvg = (d.avgDeltaInternos + d.avgDeltaExternos) / 2;
    [d.avgDeltaAuto, obsAvg].forEach((val, vi) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C_BLACK);
      doc.text(deltaSign(val), cx + cols[vi + 1] / 2, y + rowH / 2 + 1, { align: "center" });
      cx += cols[vi + 1];
    });
    y += rowH;
  });

  return y + 4;
}

// ═══════════════════════════════════════════════
// Competency detail table (multi-page)
// ═══════════════════════════════════════════════

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
    doc.setFillColor(...C_HEADER_BG);
    doc.rect(x, y, w, rowH + 1, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C_WHITE);
    let hx = x;
    headers.forEach((h, i) => {
      doc.text(h, i === 0 ? hx + 3 : hx + cols[i] / 2, y + rowH / 2 + 1, i === 0 ? {} : { align: "center" });
      hx += cols[i];
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

    if (i % 2 === 0) {
      doc.setFillColor(...C_STRIPE);
      doc.rect(x, y, w, rowH, "F");
    }
    doc.setDrawColor(...C_SUBTLE);
    doc.setLineWidth(0.08);
    doc.line(x, y + rowH, x + w, y + rowH);

    doc.setFontSize(5.8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C_BLACK);
    let tx = x;
    const label = c.competencyLabel.length > 30 ? c.competencyLabel.substring(0, 28) + "…" : c.competencyLabel;
    doc.text(label, tx + 3, y + rowH / 2 + 1);
    tx += cols[0];

    const vals = [c.avgInicialAuto, c.avgFinalAuto, c.avgDeltaAuto, c.avgInicialObs, c.avgFinalObs, c.avgDeltaObs];
    vals.forEach((v, vi) => {
      const isDelta = vi === 2 || vi === 5;
      const text = isDelta ? deltaSign(v) : r1(v);
      doc.setFont("helvetica", isDelta ? "bold" : "normal");
      doc.setTextColor(...C_BLACK);
      doc.text(text, tx + cols[vi + 1] / 2, y + rowH / 2 + 1, { align: "center" });
      tx += cols[vi + 1];
    });
    y += rowH;
  });

  return pageNum;
}
