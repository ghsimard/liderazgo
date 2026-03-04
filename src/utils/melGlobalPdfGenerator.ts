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

  const pxToMm = 25.4 / 96 * 0.50;
  const rltW = rltSize.width * pxToMm;
  const rltH = rltSize.height * pxToMm;
  const cltW = cltSize.width * pxToMm;
  const cltH = cltSize.height * pxToMm;
  doc.addImage(rltB64, "PNG", margin, 25, rltW, rltH);
  doc.addImage(cltB64, "PNG", pageW - margin - cltW, 25, cltW, cltH);

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
  doc.text(`${agg.countWithData} directivo(s) con datos · ${agg.countPositiveAuto} con progresión positiva`, pageW / 2, y, { align: "center" });

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
  const cols = [w * 0.34, w * 0.22, w * 0.22, w * 0.22];
  const rowH = 6;
  const headers = ["Dominio", "Δ Auto", "Δ Internos", "Δ Externos"];

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
    doc.text(d.domainLabel.substring(0, 35), cx + 2, y + rowH / 2 + 1);
    cx += cols[0];
    [d.avgDeltaAuto, d.avgDeltaInternos, d.avgDeltaExternos].forEach((val, vi) => {
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
