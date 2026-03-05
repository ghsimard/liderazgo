import jsPDF from "jspdf";
import type { AggregatedMel } from "./melGlobalTypes";

// ── Grayscale colors (monochrome printing) ──
const C_BLACK: [number, number, number] = [30, 30, 30];
const C_DARK: [number, number, number] = [60, 60, 60];
const C_MID: [number, number, number] = [120, 120, 120];
const C_LIGHT: [number, number, number] = [190, 190, 190];
const C_HEADER: [number, number, number] = [60, 60, 60];
const C_STRIPE: [number, number, number] = [245, 245, 245];

function r1(n: number): string {
  return n.toFixed(2).replace(".", ",");
}
function deltaSign(n: number): string {
  return n > 0 ? `+${r1(n)}` : r1(n);
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

/** Convert an SVG element to a PNG data URL */
function svgToDataUrl(svgEl: SVGSVGElement, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    // Inline computed styles
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      text { font-family: Helvetica, Arial, sans-serif; }
      .recharts-text { fill: #333; }
    `;
    clone.insertBefore(styleEl, clone.firstChild);

    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 2; // retina
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
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("SVG to image conversion failed"));
    };
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

export async function generarMelGlobalPDF(
  agg: AggregatedMel,
  logoSources: MelGlobalPdfLogos,
  charts: ChartCaptures,
  filterLabel: string,
): Promise<void> {
  // Capture chart images first (while DOM is visible)
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
  const margin = 20;
  const contentW = pageW - margin * 2;

  const drawPageHeader = () => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Programa RLT y CLT", margin, 10);
    doc.text("Informe Global MEL", pageW - margin, 10, { align: "right" });
  };

  // ═══════════════════════════════════════════
  // PAGE 1 — COVER
  // ═══════════════════════════════════════════
  drawPageHeader();

  const logoTargetH = 24; // mm – same height for both logos
  const rltW = (rltSize.width / rltSize.height) * logoTargetH;
  const cltW = (cltSize.width / cltSize.height) * logoTargetH;
  doc.addImage(rltB64, "PNG", margin, 25, rltW, logoTargetH);
  doc.addImage(cltB64, "PNG", pageW - margin - cltW, 25, cltW, logoTargetH);

  let y = 80;
  doc.setTextColor(...C_BLACK);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PROGRAMA", pageW / 2, y, { align: "center" });
  y += 8;
  doc.text("RECTORES LÍDERES TRANSFORMADORES", pageW / 2, y, { align: "center" });
  y += 8;
  doc.text("COORDINADORES LÍDERES TRANSFORMADORES", pageW / 2, y, { align: "center" });

  y += 30;
  doc.setFontSize(28);
  doc.setTextColor(...C_DARK);
  doc.text("Informe Global MEL", pageW / 2, y, { align: "center" });
  y += 14;
  doc.setFontSize(14);
  doc.setTextColor(...C_MID);
  doc.text("Monitoring, Evaluation & Learning", pageW / 2, y, { align: "center" });

  y += 25;
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_BLACK);
  doc.text(filterLabel || "Todos los directivos", pageW / 2, y, { align: "center" });

  y += 15;
  doc.setFontSize(10);
  doc.setTextColor(...C_MID);
  doc.text(`${agg.countBothPhases} de ${agg.countWithData} directivo(s) con datos en ambas fases · ${agg.countPositiveAuto} con progresión positiva (ΔP ≥ 0,5)`, pageW / 2, y, { align: "center" });

  // ═══════════════════════════════════════════
  // PAGE 2 — KPI + DOMAIN CHART + DOMAIN TABLE
  // ═══════════════════════════════════════════
  doc.addPage();
  drawPageHeader();
  y = 25;

  // KPI boxes
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text("RESUMEN GLOBAL", margin, y);
  y += 8;

  const boxW = contentW / 4 - 3;
  const boxH = 20;
  const kpis = [
    { label: "Directivos", value: String(agg.countWithData) },
    { label: "Δ Auto prom.", value: deltaSign(agg.avgDeltaAuto) },
    { label: "Δ Obs. prom.", value: deltaSign(agg.avgDeltaObserver) },
    { label: "Progresión +", value: String(agg.countPositiveAuto) },
  ];
  kpis.forEach((kpi, i) => {
    const bx = margin + i * (boxW + 4);
    doc.setFillColor(...C_STRIPE);
    doc.roundedRect(bx, y, boxW, boxH, 2, 2, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C_MID);
    doc.text(kpi.label, bx + boxW / 2, y + 6, { align: "center" });
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C_BLACK);
    doc.text(kpi.value, bx + boxW / 2, y + 15, { align: "center" });
  });
  y += boxH + 10;

  // MEL Indicator: % incremento por gestión
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text("INDICADOR MEL: AUTOEVALUACIÓN", margin, y);
  y += 3;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_MID);
  doc.text("% de directivos con incremento en autoevaluación (ΔP ≥ 0,5) · Meta: 80% · Línea base: 0%", margin, y);
  y += 5;

  // Global bar
  const barH = 5;
  const barW = contentW - 40;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text(`Global: ${agg.globalPctPositive.toFixed(1)}%`, margin, y + barH / 2 + 1);
  const barX = margin + 35;
  doc.setFillColor(...C_LIGHT);
  doc.roundedRect(barX, y, barW, barH, 1, 1, "F");
  const fillW = Math.min(agg.globalPctPositive, 100) / 100 * barW;
  doc.setFillColor(agg.globalPctPositive >= 80 ? 34 : agg.globalPctPositive >= 50 ? 180 : 200, agg.globalPctPositive >= 80 ? 139 : agg.globalPctPositive >= 50 ? 140 : 60, agg.globalPctPositive >= 80 ? 34 : agg.globalPctPositive >= 50 ? 0 : 60);
  doc.roundedRect(barX, y, fillW, barH, 1, 1, "F");
  // Target line at 80%
  const targetX = barX + barW * 0.8;
  doc.setDrawColor(...C_DARK);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(targetX, y - 1, targetX, y + barH + 1);
  doc.setLineDashPattern([], 0);
  y += barH + 4;

  // Per domain bars
  for (const d of agg.domainIncrementPcts) {
    const label = d.domainLabel.length > 25 ? d.domainLabel.substring(0, 23) + "…" : d.domainLabel;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C_BLACK);
    doc.text(`${label}: ${d.pctPositive.toFixed(1)}%`, margin, y + barH / 2 + 1);
    doc.setFillColor(...C_LIGHT);
    doc.roundedRect(barX, y, barW, barH, 1, 1, "F");
    const dFillW = Math.min(d.pctPositive, 100) / 100 * barW;
    doc.setFillColor(d.pctPositive >= 80 ? 34 : d.pctPositive >= 50 ? 180 : 200, d.pctPositive >= 80 ? 139 : d.pctPositive >= 50 ? 140 : 60, d.pctPositive >= 80 ? 34 : d.pctPositive >= 50 ? 0 : 60);
    doc.roundedRect(barX, y, dFillW, barH, 1, 1, "F");
    doc.setDrawColor(...C_DARK);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(targetX, y - 0.5, targetX, y + barH + 0.5);
    doc.setLineDashPattern([], 0);
    y += barH + 3;
  }
  doc.setFontSize(6);
  doc.setTextColor(...C_MID);
  doc.text(`(${agg.countPositiveAuto} / ${agg.countBothPhases} directivos con incremento global)`, margin, y);
  y += 6;

  // ── Observer indicator (combined) ──
  const obsNeededH = 20 + (agg.domainIncrementPctsObserver.length + 1) * (barH + 3);
  if (y + obsNeededH > pageH - 20) {
    doc.addPage();
    drawPageHeader();
    y = 25;
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text("INDICADOR MEL: OBSERVADORES", margin, y);
  y += 3;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_MID);
  doc.text("% de directivos con incremento (ΔP ≥ 0.5) por gestión según observadores · Meta: 80%", margin, y);
  y += 5;

  // Global bar
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text(`Global: ${agg.globalPctPositiveObserver.toFixed(1)}%`, margin, y + barH / 2 + 1);
  doc.setFillColor(...C_LIGHT);
  doc.roundedRect(barX, y, barW, barH, 1, 1, "F");
  const oFillW = Math.min(agg.globalPctPositiveObserver, 100) / 100 * barW;
  doc.setFillColor(agg.globalPctPositiveObserver >= 80 ? 34 : agg.globalPctPositiveObserver >= 50 ? 180 : 200, agg.globalPctPositiveObserver >= 80 ? 139 : agg.globalPctPositiveObserver >= 50 ? 140 : 60, agg.globalPctPositiveObserver >= 80 ? 34 : agg.globalPctPositiveObserver >= 50 ? 0 : 60);
  doc.roundedRect(barX, y, oFillW, barH, 1, 1, "F");
  doc.setDrawColor(...C_DARK);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(targetX, y - 1, targetX, y + barH + 1);
  doc.setLineDashPattern([], 0);
  y += barH + 4;

  for (const d of agg.domainIncrementPctsObserver) {
    const label = d.domainLabel.length > 25 ? d.domainLabel.substring(0, 23) + "…" : d.domainLabel;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C_BLACK);
    doc.text(`${label}: ${d.pctPositive.toFixed(1)}%`, margin, y + barH / 2 + 1);
    doc.setFillColor(...C_LIGHT);
    doc.roundedRect(barX, y, barW, barH, 1, 1, "F");
    const dFillW = Math.min(d.pctPositive, 100) / 100 * barW;
    doc.setFillColor(d.pctPositive >= 80 ? 34 : d.pctPositive >= 50 ? 180 : 200, d.pctPositive >= 80 ? 139 : d.pctPositive >= 50 ? 140 : 60, d.pctPositive >= 80 ? 34 : d.pctPositive >= 50 ? 0 : 60);
    doc.roundedRect(barX, y, dFillW, barH, 1, 1, "F");
    doc.setDrawColor(...C_DARK);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(targetX, y - 0.5, targetX, y + barH + 0.5);
    doc.setLineDashPattern([], 0);
    y += barH + 3;
  }
  y += 4;

  // Domain chart image
  if (domainImg) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C_BLACK);
    doc.text("PROGRESIÓN POR DOMINIO", margin, y);
    y += 4;
    const imgH = 60;
    doc.addImage(domainImg, "PNG", margin, y, contentW, imgH);
    y += imgH + 6;
  }

  // Domain table
  if (y + 10 + agg.domainDeltas.length * 6 > pageH - 20) {
    doc.addPage();
    drawPageHeader();
    y = 25;
  }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text("DELTAS PROMEDIO POR DOMINIO", margin, y);
  y += 5;
  drawDomainTable(doc, agg.domainDeltas, margin, y, contentW);
  y += 7 + agg.domainDeltas.length * 6 + 8;

  // ═══════════════════════════════════════════
  // PAGE 3 — RADAR + COMPETENCY CHART
  // ═══════════════════════════════════════════
  doc.addPage();
  drawPageHeader();
  y = 25;

  if (radarImg) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C_BLACK);
    doc.text("COMPARACIÓN INICIAL VS FINAL", margin, y);
    y += 4;
    const radarH = 80;
    doc.addImage(radarImg, "PNG", margin + 10, y, contentW - 20, radarH);
    y += radarH + 8;
  }

  if (compImg) {
    if (y + 80 > pageH - 20) {
      doc.addPage();
      drawPageHeader();
      y = 25;
    }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C_BLACK);
    doc.text("DELTAS POR COMPETENCIA", margin, y);
    y += 4;
    const compH = Math.min(90, pageH - y - 20);
    doc.addImage(compImg, "PNG", margin, y, contentW, compH);
    y += compH + 8;
  }

  // ═══════════════════════════════════════════
  // PAGE 4 — COMPETENCY DETAIL TABLE
  // ═══════════════════════════════════════════
  doc.addPage();
  drawPageHeader();
  y = 25;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text("DETALLE POR COMPETENCIA", margin, y);
  y += 5;

  drawCompetencyTable(doc, agg.competencyDeltas, margin, y, contentW, pageH, drawPageHeader);

  // Save
  const safeName = (filterLabel || "Global").replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, "").replace(/\s+/g, "_");
  doc.save(`MEL_Global_${safeName}.pdf`);
}

// ── Domain table ──
function drawDomainTable(
  doc: jsPDF,
  domains: AggregatedMel["domainDeltas"],
  x: number, y: number, w: number
) {
  const cols = [w * 0.40, w * 0.30, w * 0.30];
  const rowH = 6;
  const headers = ["Dominio", "Δ Auto", "Δ Observadores"];

  doc.setFillColor(...C_HEADER);
  doc.rect(x, y, w, rowH, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  let tx = x;
  headers.forEach((h, i) => {
    doc.text(h, i === 0 ? tx + 2 : tx + cols[i] / 2, y + rowH / 2 + 1, i === 0 ? {} : { align: "center" });
    tx += cols[i];
  });
  y += rowH;

  doc.setTextColor(...C_BLACK);
  doc.setFont("helvetica", "normal");
  domains.forEach((d, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(...C_STRIPE);
      doc.rect(x, y, w, rowH, "F");
    }
    let cx = x;
    doc.setFontSize(7);
    doc.text(d.domainLabel.substring(0, 40), cx + 2, y + rowH / 2 + 1);
    cx += cols[0];
    const obsAvg = (d.avgDeltaInternos + d.avgDeltaExternos) / 2;
    [d.avgDeltaAuto, obsAvg].forEach((val, vi) => {
      doc.text(deltaSign(val), cx + cols[vi + 1] / 2, y + rowH / 2 + 1, { align: "center" });
      cx += cols[vi + 1];
    });
    y += rowH;
  });
}

// ── Competency table ──
function drawCompetencyTable(
  doc: jsPDF,
  comps: AggregatedMel["competencyDeltas"],
  x: number, startY: number, w: number,
  pageH: number, drawPageHeader: () => void
) {
  const cols = [w * 0.28, w * 0.12, w * 0.12, w * 0.12, w * 0.12, w * 0.12, w * 0.12];
  const headers = ["Competencia", "Ini Auto", "Fin Auto", "Δ Auto", "Ini Obs.", "Fin Obs.", "Δ Obs."];
  const rowH = 5.5;

  let y = startY;

  const drawHeader = () => {
    doc.setFillColor(...C_HEADER);
    doc.rect(x, y, w, rowH + 1, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    let tx = x;
    headers.forEach((h, i) => {
      doc.text(h, i === 0 ? tx + 2 : tx + cols[i] / 2, y + rowH / 2 + 1, i === 0 ? {} : { align: "center" });
      tx += cols[i];
    });
    y += rowH + 1;
  };

  drawHeader();

  doc.setFont("helvetica", "normal");
  comps.forEach((c, i) => {
    if (y > pageH - 20) {
      doc.addPage();
      drawPageHeader();
      y = 25;
      drawHeader();
    }
    if (i % 2 === 0) {
      doc.setFillColor(...C_STRIPE);
      doc.rect(x, y, w, rowH, "F");
    }
    doc.setTextColor(...C_BLACK);
    doc.setFontSize(5.5);
    let tx = x;
    const label = c.competencyLabel.length > 28 ? c.competencyLabel.substring(0, 26) + "…" : c.competencyLabel;
    doc.text(label, tx + 2, y + rowH / 2 + 1);
    tx += cols[0];
    const vals = [c.avgInicialAuto, c.avgFinalAuto, c.avgDeltaAuto, c.avgInicialObs, c.avgFinalObs, c.avgDeltaObs];
    vals.forEach((v, vi) => {
      const text = vi === 2 || vi === 5 ? deltaSign(v) : r1(v);
      doc.text(text, tx + cols[vi + 1] / 2, y + rowH / 2 + 1, { align: "center" });
      tx += cols[vi + 1];
    });
    y += rowH;
  });
}
