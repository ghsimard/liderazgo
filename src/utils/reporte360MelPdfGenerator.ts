import jsPDF from "jspdf";
import type { MelAnalysisData, MelCompetencyDelta, MelDomainDelta } from "./reporte360MelCalculator";

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

// ── Grayscale colors ──
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
  if (n > 0) return `+${r1(n)}`;
  return r1(n);
}

export interface MelPdfLogos {
  logoRLT: string;
  logoCLT: string;
  showRLT?: boolean;
  showCLT?: boolean;
}

export async function generarMelPDF(
  data: MelAnalysisData,
  logoSources: MelPdfLogos,
  options: { returnBlob?: boolean } = {}
): Promise<Blob | void> {
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
    doc.text("Informe Análisis 360", pageW - margin, 10, { align: "right" });
  };

  // ═══════════════════════════════════════════
  // PAGE 1 — COVER
  // ═══════════════════════════════════════════
  drawPageHeader();

  const showRLT = logoSources.showRLT !== false;
  const showCLT = logoSources.showCLT !== false;
  const logoTargetH = 24; // mm – same height for both logos
  const rltW = (rltSize.width / rltSize.height) * logoTargetH;
  const cltW = (cltSize.width / cltSize.height) * logoTargetH;
  // Logos drawn centered below

  // Center logos closer to title
  let y = 60;

  // Draw logos centered together
  const logoGap = 10;
  const totalLogosW = (showRLT ? rltW : 0) + (showCLT ? cltW : 0) + (showRLT && showCLT ? logoGap : 0);
  let logoX = (pageW - totalLogosW) / 2;
  if (showRLT) {
    doc.addImage(rltB64, "PNG", logoX, y - logoTargetH / 2, rltW, logoTargetH);
    logoX += rltW + logoGap;
  }
  if (showCLT) {
    doc.addImage(cltB64, "PNG", logoX, y - logoTargetH / 2, cltW, logoTargetH);
  }

  y += logoTargetH / 2 + 15;
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
  doc.text("Análisis 360", pageW / 2, y, { align: "center" });
  y += 14;
  doc.setFontSize(14);
  doc.setTextColor(...C_MID);
  doc.text("Monitoring, Evaluation & Learning", pageW / 2, y, { align: "center" });

  y += 25;
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_BLACK);
  doc.text(data.directivoNombre, pageW / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(12);
  doc.setTextColor(...C_MID);
  doc.text(data.institucion, pageW / 2, y, { align: "center" });

  // ═══════════════════════════════════════════
  // PAGE 2 — GLOBAL SUMMARY + DOMAIN CHART
  // ═══════════════════════════════════════════
  doc.addPage();
  drawPageHeader();
  y = 25;

  // Page title matching UI dialog
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text(`Análisis MEL — ${data.directivoNombre}`, margin, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_MID);
  doc.text(data.institucion, margin, y + 6);
  y += 14;

  // Global delta boxes
  const boxW = contentW / 2 - 3;
  const boxH = 22;

  // Auto box
  doc.setFillColor(...C_STRIPE);
  doc.roundedRect(margin, y, boxW, boxH, 2, 2, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_MID);
  doc.text("Δ Autoevaluación Global", margin + boxW / 2, y + 6, { align: "center" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text(deltaSign(data.globalDeltaAuto), margin + boxW / 2, y + 15, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_MID);
  doc.text(
    `${data.inicial?.autoAvg.toFixed(2) ?? "—"} \u2192 ${data.final?.autoAvg.toFixed(2) ?? "—"}`,
    margin + boxW / 2, y + 20, { align: "center" }
  );

  // Observer box
  const box2X = margin + boxW + 6;
  doc.setFillColor(...C_STRIPE);
  doc.roundedRect(box2X, y, boxW, boxH, 2, 2, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_MID);
  doc.text("Δ Observadores Global", box2X + boxW / 2, y + 6, { align: "center" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text(deltaSign(data.globalDeltaObserver), box2X + boxW / 2, y + 15, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_MID);
  doc.text(
    `${data.inicial?.observerAvg.toFixed(2) ?? "—"} \u2192 ${data.final?.observerAvg.toFixed(2) ?? "—"}`,
    box2X + boxW / 2, y + 20, { align: "center" }
  );

  y += boxH + 10;

  // ── Note: validation criterion (matching UI) ──
  if (data.hasInicial && data.hasFinal) {
    const meets = data.globalDeltaAuto >= 0.5;
    const noteText = meets
      ? "Cumple criterio MEL (0,5+ puntos de progresión)."
      : "No cumple criterio MEL (menos de 0,5 puntos de progresión).";
    const noteH = 9;
    // Background fill
    doc.setFillColor(...(meets ? [236, 253, 245] as [number, number, number] : [254, 242, 242] as [number, number, number]));
    // Border
    doc.setDrawColor(...(meets ? [134, 239, 172] as [number, number, number] : [220, 140, 140] as [number, number, number]));
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentW, noteH, 1.5, 1.5, "FD");
    // Centered text
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(meets ? [6, 95, 70] as [number, number, number] : [180, 40, 40] as [number, number, number]));
    doc.text(noteText, margin + contentW / 2, y + noteH / 2 + 1, { align: "center" });
    doc.setDrawColor(0);
    y += noteH + 6;
  }

  // ── Domain deltas chart ──
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text("PROGRESIÓN POR DOMINIO", margin, y);
  y += 4;

  // Legend
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const legendItems = [
    { color: C_BLACK, label: "Δ Autoevaluación" },
    { color: C_MID, label: "Δ Internos" },
    { color: C_LIGHT, label: "Δ Externos" },
  ];
  let totalLW = 0;
  legendItems.forEach((item, i) => {
    totalLW += 4 + 1 + doc.getTextWidth(item.label) + (i < legendItems.length - 1 ? 14 : 0);
  });
  let lx = margin + (contentW - totalLW) / 2;
  legendItems.forEach((item, i) => {
    doc.setFillColor(...item.color);
    doc.rect(lx, y, 4, 3, "F");
    doc.text(item.label, lx + 5, y + 2.5);
    lx += 4 + 1 + doc.getTextWidth(item.label) + 14;
  });
  y += 8;

  drawDomainDeltaChart(doc, data.domainDeltas, margin, y, contentW, Math.max(55, data.domainDeltas.length * 16));
  y += Math.max(55, data.domainDeltas.length * 16) + 7;

  // ── Domain initial vs final chart ──
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text("COMPARACIÓN INICIAL VS FINAL POR DOMINIO", margin, y);
  y += 4;

  // Legend
  const legendIvF = [
    { color: C_LIGHT, label: "Inicial" },
    { color: C_BLACK, label: "Final" },
  ];
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  let ivfLW = 0;
  legendIvF.forEach((item, i) => {
    ivfLW += 4 + 1 + doc.getTextWidth(item.label) + (i < legendIvF.length - 1 ? 8 : 0);
  });
  let ivfLx = margin + (contentW - ivfLW) / 2;
  legendIvF.forEach((item) => {
    doc.setFillColor(...item.color);
    doc.rect(ivfLx, y, 4, 3, "F");
    doc.text(item.label, ivfLx + 5, y + 2.5);
    ivfLx += 4 + 1 + doc.getTextWidth(item.label) + 8;
  });
  y += 8;

  const ivfChartH = Math.max(45, data.domainDeltas.length * 14);
  drawDomainInitialFinalChart(doc, data, margin, y, contentW, ivfChartH);
  y += ivfChartH + 8;

  // ── Indicator: increment per domain (bar charts) ──
  if (data.hasInicial && data.hasFinal) {
    // Collect all deltas to find a shared max for consistent scale
    const allDeltas = data.domainDeltas.flatMap(d => [
      Math.abs(d.deltaAuto), Math.abs(d.deltaInternos), Math.abs(d.deltaExternos)
    ]);
    const maxDelta = Math.max(1, ...allDeltas);
    const scale = Math.ceil(maxDelta * 10) / 10 + 0.2;

    const indicators = [
      { title: "INDICADOR: INCREMENTO POR GESTIÓN", subtitle: "Progresión del puntaje promedio (auto) por dominio", getter: (d: MelDomainDelta) => d.deltaAuto },
      { title: "INDICADOR: INTERNOS (Pares, Docentes, Administrativos)", subtitle: null, getter: (d: MelDomainDelta) => d.deltaInternos },
      { title: "INDICADOR: EXTERNOS (Estudiantes, Acudientes)", subtitle: null, getter: (d: MelDomainDelta) => d.deltaExternos },
    ];

    const labelW = 55;
    const barH = 6;
    const rowGap = 3;

    for (const indicator of indicators) {
      const neededH = 15 + data.domainDeltas.length * (barH + rowGap) + 10;
      if (y + neededH > pageH - 20) {
        doc.addPage();
        drawPageHeader();
        y = 25;
      }

      // Title
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C_BLACK);
      doc.text(indicator.title, margin, y);
      y += 4;
      if (indicator.subtitle) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C_MID);
        doc.text(indicator.subtitle, margin, y);
        y += 4;
      }

      const chartX = margin + labelW;
      const chartW = contentW - labelW;

      // Scale
      doc.setFontSize(5);
      doc.setTextColor(150, 150, 150);
      doc.text("0", chartX, y);
      doc.text(`+${scale.toFixed(1)}`, chartX + chartW, y, { align: "right" });
      y += 3;

      for (const d of data.domainDeltas) {
        const delta = indicator.getter(d);
        const absDelta = Math.max(0, Math.abs(delta));
        const bw = (absDelta / scale) * chartW;
        const hasInc = delta > 0;
        const label = d.domainLabel;

        // Label
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C_BLACK);
        doc.text(label, chartX - 3, y + barH / 2 + 1, { align: "right" });

        // Bar background
        doc.setFillColor(245, 245, 245);
        doc.rect(chartX, y, chartW, barH, "F");

        // Bar fill
        doc.setFillColor(hasInc ? 34 : 180, hasInc ? 139 : 80, hasInc ? 34 : 80);
        if (bw > 0.3) doc.rect(chartX, y, bw, barH, "F");

        // Value on bar
        doc.setFontSize(5.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(bw > 12 ? 255 : 60, bw > 12 ? 255 : 60, bw > 12 ? 255 : 60);
        const valText = (delta >= 0 ? "+" : "") + delta.toFixed(2);
        if (bw > 12) {
          doc.text(valText, chartX + bw - 1.5, y + barH / 2 + 1, { align: "right" });
        } else {
          doc.setTextColor(60, 60, 60);
          doc.text(valText, chartX + bw + 1.5, y + barH / 2 + 1);
        }

        y += barH + rowGap;
      }

      const posCount = data.domainDeltas.filter(d => indicator.getter(d) > 0).length;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C_MID);
      doc.text(`${posCount} / ${data.domainDeltas.length} dominios con incremento positivo`, margin, y);
      y += 8;
    }
  }

  // ═══════════════════════════════════════════
  // PAGE 3 — COMPETENCY DELTAS
  // ═══════════════════════════════════════════
  doc.addPage();
  drawPageHeader();
  y = 25;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text("PROGRESIÓN POR COMPETENCIA", margin, y);
  y += 4;

  // Legend for competency chart
  const legendItems2 = [
    { color: C_BLACK, label: "Δ Autoevaluación" },
    { color: C_MID, label: "Δ Observadores" },
  ];
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  let totalLW2 = 0;
  legendItems2.forEach((item, i) => {
    totalLW2 += 4 + 1 + doc.getTextWidth(item.label) + (i < legendItems2.length - 1 ? 8 : 0);
  });
  let lx2 = margin + (contentW - totalLW2) / 2;
  legendItems2.forEach((item, i) => {
    doc.setFillColor(...item.color);
    doc.rect(lx2, y, 4, 3, "F");
    doc.text(item.label, lx2 + 5, y + 2.5);
    lx2 += 4 + 1 + doc.getTextWidth(item.label) + 8;
  });
  y += 8;

  drawCompetencyDeltaChart(doc, data.competencyDeltas, margin, y, contentW, 110);
  y += 118;

  // Competency detail table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text("DETALLE POR COMPETENCIA", margin, y);
  y += 5;

  drawCompetencyTable(doc, data.competencyDeltas, margin, y, contentW, pageH, drawPageHeader);

  // ── Save / return ──
  const safeName = data.directivoNombre.replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, "").replace(/\s+/g, "_");
  if (options.returnBlob) {
    return doc.output("blob");
  }
  doc.save(`MEL_${safeName}.pdf`);
}

// ── Draw grouped bar chart for domain deltas ──
function drawDomainDeltaChart(
  doc: jsPDF,
  domains: MelDomainDelta[],
  x: number, y: number, w: number, h: number
) {
  const labelW = w * 0.22;
  const chartW = w - labelW;
  const rowH = h / domains.length;
  const barH = Math.min(rowH * 0.25, 3.5);
  const gap = 1;

  // Collect all values to determine range
  const allVals: number[] = [];
  domains.forEach((d) => {
    allVals.push(d.deltaAuto, d.deltaInternos, d.deltaExternos);
  });
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);

  // If all values >= 0, use 0-based chart; if all <= 0, use negative-only; otherwise diverging
  const allPositive = minVal >= 0;
  const allNegative = maxVal <= 0;

  let maxAbs = Math.max(Math.abs(minVal), Math.abs(maxVal));
  maxAbs = Math.ceil(maxAbs * 10) / 10 + 0.3;

  const chartX = x + labelW;

  // Determine zero position
  let zeroX: number;
  let scaleWidth: number;
  if (allPositive) {
    zeroX = chartX;
    scaleWidth = chartW;
  } else if (allNegative) {
    zeroX = chartX + chartW;
    scaleWidth = chartW;
  } else {
    zeroX = chartX + chartW / 2;
    scaleWidth = chartW / 2;
  }

  // Scale labels
  doc.setFontSize(6);
  doc.setTextColor(130, 130, 130);
  if (allPositive) {
    doc.text("0", chartX, y - 1.5);
    doc.text(`+${maxAbs.toFixed(1)}`, chartX + chartW - 1, y - 1.5, { align: "right" });
  } else if (allNegative) {
    doc.text(`-${maxAbs.toFixed(1)}`, chartX + 1, y - 1.5);
    doc.text("0", chartX + chartW, y - 1.5, { align: "right" });
  } else {
    doc.text(`-${maxAbs.toFixed(1)}`, chartX + 1, y - 1.5);
    doc.text("0", zeroX, y - 1.5, { align: "center" });
    doc.text(`+${maxAbs.toFixed(1)}`, chartX + chartW - 1, y - 1.5, { align: "right" });
  }

  // Zero line
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.3);
  doc.line(zeroX, y, zeroX, y + h);

  domains.forEach((d, i) => {
    const cy = y + i * rowH + rowH / 2;

    // Alternating background
    if (i % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(x, y + i * rowH, w, rowH, "F");
    }

    // Separator
    if (i > 0) {
      doc.setDrawColor(235, 235, 235);
      doc.setLineWidth(0.1);
      doc.line(x, y + i * rowH, x + w, y + i * rowH);
    }

    // Label
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C_BLACK);
    const label = d.domainLabel;
    doc.text(label, x + labelW - 4, cy + 0.5, { align: "right" });

    const bars = [
      { val: d.deltaAuto, color: C_BLACK as [number, number, number] },
      { val: d.deltaInternos, color: C_MID as [number, number, number] },
      { val: d.deltaExternos, color: C_LIGHT as [number, number, number] },
    ];

    const totalBarsH = bars.length * barH + (bars.length - 1) * gap;
    let by = cy - totalBarsH / 2;

    bars.forEach((bar) => {
      const barW = (Math.abs(bar.val) / maxAbs) * scaleWidth;
      doc.setFillColor(...bar.color);

      if (bar.val >= 0) {
        doc.roundedRect(zeroX, by, Math.max(barW, 0.3), barH, 0.5, 0.5, "F");
      } else {
        doc.roundedRect(zeroX - barW, by, Math.max(barW, 0.3), barH, 0.5, 0.5, "F");
      }

      // Value label
      doc.setFontSize(5);
      doc.setTextColor(...bar.color);
      const valText = bar.val >= 0 ? `+${bar.val.toFixed(2)}` : bar.val.toFixed(2);
      if (bar.val >= 0) {
        doc.text(valText, zeroX + barW + 1.5, by + barH - 0.3);
      } else {
        doc.text(valText, zeroX - barW - 1, by + barH - 0.3, { align: "right" });
      }

      by += barH + gap;
    });
  });

  // Re-draw zero line on top
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.3);
  doc.line(zeroX, y, zeroX, y + h);
}

// ── Draw initial vs final grouped bar chart per domain ──
function drawDomainInitialFinalChart(
  doc: jsPDF,
  data: MelAnalysisData,
  x: number, y: number, w: number, h: number
) {
  const domains = data.domainDeltas;
  const labelW = w * 0.22;
  const chartW = w - labelW;
  const rowH = h / domains.length;
  const barH = Math.min(rowH * 0.35, 4);
  const gap = 1;
  const chartX = x + labelW;

  // Get initial and final domain averages from the data
  // domainDeltas has: inicialAuto, deltaAuto (so final = inicial + delta)
  const maxVal = Math.max(10, ...domains.map(d => Math.max(
    d.inicialAuto, d.inicialAuto + d.deltaAuto,
    d.inicialInternos, d.inicialInternos + d.deltaInternos,
    d.inicialExternos, d.inicialExternos + d.deltaExternos
  )));
  const scale = Math.ceil(maxVal);

  // Scale labels
  doc.setFontSize(6);
  doc.setTextColor(130, 130, 130);
  doc.text("0", chartX, y - 1.5);
  doc.text(scale.toString(), chartX + chartW - 1, y - 1.5, { align: "right" });

  // Grid lines
  doc.setDrawColor(240, 240, 240);
  doc.setLineWidth(0.1);
  for (let g = 2; g < scale; g += 2) {
    const gx = chartX + (g / scale) * chartW;
    doc.line(gx, y, gx, y + h);
    doc.setFontSize(5);
    doc.setTextColor(180, 180, 180);
    doc.text(g.toString(), gx, y - 1.5, { align: "center" });
  }

  domains.forEach((d, i) => {
    const cy = y + i * rowH + rowH / 2;

    // Alternating background
    if (i % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(x, y + i * rowH, w, rowH, "F");
    }

    // Separator
    if (i > 0) {
      doc.setDrawColor(235, 235, 235);
      doc.setLineWidth(0.1);
      doc.line(x, y + i * rowH, x + w, y + i * rowH);
    }

    // Label
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C_BLACK);
    const label = d.domainLabel;
    doc.text(label, x + labelW - 4, cy + 0.5, { align: "right" });

    const inicial = d.inicialAuto;
    const final_ = d.inicialAuto + d.deltaAuto;

    // Initial bar (light)
    const iniW = (inicial / scale) * chartW;
    doc.setFillColor(...C_LIGHT);
    doc.roundedRect(chartX, cy - barH - gap / 2, Math.max(iniW, 0.3), barH, 0.5, 0.5, "F");

    // Final bar (dark)
    const finW = (final_ / scale) * chartW;
    doc.setFillColor(...C_BLACK);
    doc.roundedRect(chartX, cy + gap / 2, Math.max(finW, 0.3), barH, 0.5, 0.5, "F");

    // Value labels
    doc.setFontSize(5.5);
    doc.setTextColor(...C_MID);
    doc.text(inicial.toFixed(2), chartX + iniW + 1.5, cy - gap / 2 - 0.3);
    doc.setTextColor(...C_BLACK);
    doc.text(final_.toFixed(2), chartX + finW + 1.5, cy + gap / 2 + barH - 0.3);
  });
}

function drawDomainTable(doc: jsPDF, domains: MelDomainDelta[], x: number, y: number, w: number) {
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
    [d.deltaAuto, d.deltaInternos, d.deltaExternos].forEach((val, vi) => {
      doc.text(deltaSign(val), cx + cols[vi + 1] / 2, y + rowH / 2 + 1, { align: "center" });
      cx += cols[vi + 1];
    });
    y += rowH;
  });
}

// ── Competency delta horizontal bar chart ──
function drawCompetencyDeltaChart(
  doc: jsPDF,
  comps: MelCompetencyDelta[],
  x: number, y: number, w: number, h: number
) {
  const labelW = w * 0.35;
  const chartW = w - labelW;
  const rowH = h / comps.length;
  const barH = Math.min(rowH * 0.35, 3);

  let maxVal = 1;
  comps.forEach((c) => {
    maxVal = Math.max(maxVal, Math.abs(c.deltaAuto), Math.abs(c.deltaObserver));
  });
  maxVal = Math.ceil(maxVal * 10) / 10 + 0.2;

  const chartX = x + labelW;

  // Scale labels
  doc.setFontSize(5);
  doc.setTextColor(150, 150, 150);
  doc.text("0", chartX, y - 1);
  doc.text(`+${maxVal.toFixed(1)}`, chartX + chartW, y - 1, { align: "right" });

  comps.forEach((c, i) => {
    const cy = y + i * rowH + rowH / 2;

    // Separator line between competencies
    if (i > 0) {
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.15);
      doc.line(x, y + i * rowH, x + w, y + i * rowH);
    }

    // Stripe
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(chartX, cy - rowH / 2, chartW, rowH, "F");
    }

    // Label
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C_BLACK);
    const label = c.competencyLabel.length > 30 ? c.competencyLabel.substring(0, 28) + "…" : c.competencyLabel;
    doc.text(label, x + labelW - 3, cy, { align: "right" });

    // Auto delta bar
    const autoDelta = c.deltaAuto;
    const autoAbsW = (Math.max(0, Math.abs(autoDelta)) / maxVal) * chartW;
    doc.setFillColor(...C_BLACK);
    if (autoAbsW > 0.3) doc.rect(chartX, cy - barH - 0.5, autoAbsW, barH, "F");

    // Auto value label
    doc.setFontSize(5);
    doc.setTextColor(80, 80, 80);
    const autoLabel = (autoDelta >= 0 ? "+" : "") + autoDelta.toFixed(2);
    doc.text(autoLabel, autoAbsW > 0.3 ? chartX + autoAbsW + 1.5 : chartX + 1.5, cy - 0.5);

    // Observer delta bar
    const obsDelta = c.deltaObserver;
    const obsAbsW = (Math.max(0, Math.abs(obsDelta)) / maxVal) * chartW;
    doc.setFillColor(...C_MID);
    if (obsAbsW > 0.3) doc.rect(chartX, cy + 0.5, obsAbsW, barH, "F");

    // Observer value label
    doc.setTextColor(120, 120, 120);
    const obsLabel = (obsDelta >= 0 ? "+" : "") + obsDelta.toFixed(2);
    doc.text(obsLabel, obsAbsW > 0.3 ? chartX + obsAbsW + 1.5 : chartX + 1.5, cy + barH + 1);
  });
}

// ── Competency detail table (multi-page) ──
function drawCompetencyTable(
  doc: jsPDF,
  comps: MelCompetencyDelta[],
  x: number, startY: number, w: number,
  pageH: number,
  drawPageHeader: () => void
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

    const vals = [c.inicialAuto, c.finalAuto, c.deltaAuto, c.inicialObserver, c.finalObserver, c.deltaObserver];
    vals.forEach((v, vi) => {
      const text = vi === 2 || vi === 5 ? deltaSign(v) : r1(v);
      doc.text(text, tx + cols[vi + 1] / 2, y + rowH / 2 + 1, { align: "center" });
      tx += cols[vi + 1];
    });
    y += rowH;
  });
}
