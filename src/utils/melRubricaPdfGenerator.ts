/**
 * MEL Rúbricas PDF Generator
 * Monochrome design optimised for black-ink printing.
 */

import jsPDF from "jspdf";
import type { MelRubricaData, DirectivoRubricaResult, MelRubricaKPIs } from "./melRubricaCalculator";
import { NIVEL_LABELS } from "./melRubricaCalculator";
import { loadImageAsBase64, getImageNaturalSize, logoDims, COVER_LOGO_H } from "@/utils/pdfLogoHelper";

// ── Grayscale tokens ──
const C_BLACK: [number, number, number] = [30, 30, 30];
const C_DARK: [number, number, number] = [60, 60, 60];
const C_MID: [number, number, number] = [120, 120, 120];
const C_LIGHT: [number, number, number] = [170, 170, 170];
const C_SUBTLE: [number, number, number] = [200, 200, 200];
const C_BG: [number, number, number] = [240, 240, 240];
const C_STRIPE: [number, number, number] = [248, 248, 248];
const C_HEADER_BG: [number, number, number] = [50, 50, 50];
const C_WHITE: [number, number, number] = [255, 255, 255];

function pctStr(n: number): string { return `${n.toFixed(1)}%`; }


export interface MelRubricaPdfLogos {
  logoRLT: string;
  logoCLT: string;
  showRLT?: boolean;
  showCLT?: boolean;
}

// ── Main export ──

export async function generarMelRubricasPDF(
  data: MelRubricaData,
  logoSources: MelRubricaPdfLogos,
  filterLabel: string,
  options?: { showIndividualResults?: boolean },
): Promise<void> {
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

  let pageNum = 1;

  const drawPageFooter = (pn: number) => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C_LIGHT);
    doc.text("Programa RLT y CLT · Informe MEL Rúbricas", margin, pageH - 8);
    doc.text(String(pn), pageW - margin, pageH - 8, { align: "right" });
  };

  // ═══════════════════════════════════════════
  // PAGE 1 — COVER
  // ═══════════════════════════════════════════
  const showRLT = logoSources.showRLT !== false;
  const showCLT = logoSources.showCLT !== false;
  const logoTargetH = COVER_LOGO_H;
  const rltW = logoDims(rltSize.width, rltSize.height, logoTargetH).w;
  const cltW = logoDims(cltSize.width, cltSize.height, logoTargetH).w;

  if (showRLT && showCLT) {
    // Both logos: left and right
    doc.addImage(rltB64, "PNG", margin, 28, rltW, logoTargetH);
    doc.addImage(cltB64, "PNG", pageW - margin - cltW, 28, cltW, logoTargetH);
  } else if (showRLT) {
    // Only RLT: centered
    doc.addImage(rltB64, "PNG", (pageW - rltW) / 2, 28, rltW, logoTargetH);
  } else if (showCLT) {
    // Only CLT: centered
    doc.addImage(cltB64, "PNG", (pageW - cltW) / 2, 28, cltW, logoTargetH);
  }

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
  doc.text("Informe MEL Rúbricas", pageW / 2, y, { align: "center" });
  y += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_MID);
  doc.text("Indicadores de Competencias", pageW / 2, y, { align: "center" });

  y += 28;
  doc.setFontSize(13);
  doc.setTextColor(...C_BLACK);
  doc.text(filterLabel || "Todos los directivos", pageW / 2, y, { align: "center" });

  y += 15;
  doc.setFontSize(8);
  doc.setTextColor(...C_MID);
  doc.text(
    `${data.directivos.length} directivo(s) con datos de rúbricas`,
    pageW / 2, y, { align: "center" }
  );

  drawPageFooter(pageNum);

  // ═══════════════════════════════════════════
  // PAGE 2 — KPI INDICATORS
  // ═══════════════════════════════════════════
  doc.addPage();
  pageNum++;
  y = 22;

  y = drawSectionTitle(doc, "INDICADORES MEL RÚBRICAS", margin, y);
  y += 6;

  // KPI cards
  const kpiItems: { label: string; description: string; kpi: MelRubricaKPIs["kpi1"] }[] = [
    {
      label: "INDICADOR 1: NIVEL INTERMEDIO / AVANZADO",
      description: "% de rectores que alcanzan nivel intermedio o avanzado en ≥3 de los 4 módulos",
      kpi: data.kpis.kpi1,
    },
    {
      label: "INDICADOR 2a: AUTOCONOCIMIENTO",
      description: "% de rectores con nivel avanzado en Módulo 1 (autoconocimiento)",
      kpi: data.kpis.kpi2a,
    },
    {
      label: "INDICADOR 2b: COMUNICACIÓN ASERTIVA",
      description: "% de rectores con nivel avanzado en Módulo 2 (comunicación asertiva)",
      kpi: data.kpis.kpi2b,
    },
    {
      label: "INDICADOR 3: TRABAJO COLABORATIVO",
      description: "% de rectores con nivel avanzado en Módulo 3 (trabajo colaborativo)",
      kpi: data.kpis.kpi3,
    },
  ];

  for (const item of kpiItems) {
    if (y + 38 > pageH - 15) {
      drawPageFooter(pageNum);
      doc.addPage();
      pageNum++;
      y = 22;
    }
    y = drawKpiBlock(doc, item.label, item.description, item.kpi, margin, y, contentW);
    y += 6;
  }

  drawPageFooter(pageNum);

  const showIndividual = options?.showIndividualResults !== false;

  if (showIndividual) {
  // ═══════════════════════════════════════════
  // PAGE 3+ — INDIVIDUAL RESULTS TABLE
  // ═══════════════════════════════════════════
  doc.addPage();
  pageNum++;
  y = 22;

  y = drawSectionTitle(doc, "RESULTADOS INDIVIDUALES", margin, y);
  y += 3;

  const cols = [contentW * 0.22, contentW * 0.22, contentW * 0.09, contentW * 0.09, contentW * 0.09, contentW * 0.09, contentW * 0.05, contentW * 0.05, contentW * 0.05, contentW * 0.05];
  const headers = ["Directivo", "Institución", "Mod. 1", "Mod. 2", "Mod. 3", "Mod. 4", "I.1", "I.2a", "I.2b", "I.3"];
  const rowH = 6;

  const drawTableHeader = () => {
    doc.setFillColor(...C_HEADER_BG);
    doc.rect(margin, y, contentW, rowH + 1, "F");
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C_WHITE);
    let hx = margin;
    headers.forEach((h, i) => {
      const align = i < 2 ? "left" : "center";
      const tx = i < 2 ? hx + 2 : hx + cols[i] / 2;
      doc.text(h, tx, y + rowH / 2 + 1.5, { align } as any);
      hx += cols[i];
    });
    y += rowH + 1;
  };

  drawTableHeader();

  data.directivos.forEach((d, rowIdx) => {
    if (y + rowH > pageH - 15) {
      drawPageFooter(pageNum);
      doc.addPage();
      pageNum++;
      y = 22;
      drawTableHeader();
    }

    if (rowIdx % 2 === 0) {
      doc.setFillColor(...C_STRIPE);
      doc.rect(margin, y, contentW, rowH, "F");
    }
    doc.setDrawColor(...C_SUBTLE);
    doc.setLineWidth(0.08);
    doc.line(margin, y + rowH, margin + contentW, y + rowH);

    let cx = margin;

    // Name
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C_BLACK);
    const name = d.nombre.length > 28 ? d.nombre.substring(0, 26) + "…" : d.nombre;
    doc.text(name, cx + 2, y + rowH / 2 + 1);
    cx += cols[0];

    // Institution
    doc.setTextColor(...C_DARK);
    const inst = d.institucion.length > 28 ? d.institucion.substring(0, 26) + "…" : d.institucion;
    doc.text(inst, cx + 2, y + rowH / 2 + 1);
    cx += cols[1];

    // Module levels
    for (const mod of [1, 2, 3, 4]) {
      const nivel = d.moduleLevels[mod];
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C_BLACK);
      const nivelText = nivel ? (NIVEL_LABELS[nivel] || nivel).substring(0, 6) : "—";
      doc.setFontSize(5);
      doc.text(nivelText, cx + cols[mod + 1] / 2, y + rowH / 2 + 1, { align: "center" });
      cx += cols[mod + 1];
    }

    // Indicator results
    const indicators = [
      { eligible: d.kpi1ModulesCount >= 3, cumple: d.kpi1Cumple },
      { eligible: d.kpi2aHasItem, cumple: d.kpi2aCumple },
      { eligible: d.kpi2bHasItem, cumple: d.kpi2bCumple },
      { eligible: d.kpi3HasMod3, cumple: d.kpi3Cumple },
    ];

    indicators.forEach((ind, i) => {
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      if (!ind.eligible) {
        doc.setTextColor(...C_LIGHT);
        doc.text("—", cx + cols[6 + i] / 2, y + rowH / 2 + 1, { align: "center" });
      } else if (ind.cumple) {
        doc.setTextColor(60, 60, 60);
        doc.text("✓", cx + cols[6 + i] / 2, y + rowH / 2 + 1, { align: "center" });
      } else {
        doc.setTextColor(120, 120, 120);
        doc.text("✗", cx + cols[6 + i] / 2, y + rowH / 2 + 1, { align: "center" });
      }
      cx += cols[6 + i];
    });

    y += rowH;
  });

  if (data.directivos.length === 0) {
    y += 8;
    doc.setFontSize(8);
    doc.setTextColor(...C_MID);
    doc.text("No hay datos de rúbricas para los directivos seleccionados.", pageW / 2, y, { align: "center" });
  }

  drawPageFooter(pageNum);
  } // end showIndividual

  const safeName = (filterLabel || "Global").replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, "").replace(/\s+/g, "_");
  doc.save(`MEL_Rubricas_${safeName}.pdf`);
}

// ── Section title ──

function drawSectionTitle(doc: jsPDF, text: string, x: number, y: number): number {
  doc.setDrawColor(...C_SUBTLE);
  doc.setLineWidth(0.3);
  doc.line(x, y - 1, x + 60, y - 1);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text(text, x, y + 3);
  return y + 6;
}

// ── KPI block with bullet chart ──

function drawKpiBlock(
  doc: jsPDF,
  label: string,
  description: string,
  kpi: MelRubricaKPIs["kpi1"],
  x: number, startY: number, contentW: number
): number {
  let y = startY;
  const metReached = kpi.percentage >= kpi.meta;

  // Light background
  doc.setFillColor(...C_BG);
  doc.rect(x, y, contentW, 32, "F");

  // Title
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text(label, x + 4, y + 6);

  // Description
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_MID);
  doc.text(description, x + 4, y + 11);

  // Percentage value
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text(pctStr(kpi.percentage), x + 4, y + 22);

  // Meta & count
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_MID);
  doc.text(`${kpi.numerator} / ${kpi.denominator} rectores`, x + 4, y + 27);
  doc.text(`Meta: ${kpi.meta}%`, x + 50, y + 27);

  // Bullet bar
  const barX = x + 80;
  const barW = contentW - 84;
  const barY = y + 17;
  const barH = 5;

  // Background bands
  doc.setFillColor(220, 220, 220);
  doc.rect(barX, barY, barW, barH, "F");

  // Performance bar
  const fillW = Math.max(Math.min(kpi.percentage, 100) / 100 * barW, 0.5);
  doc.setFillColor(...C_BLACK);
  doc.rect(barX, barY, fillW, barH, "F");

  // Meta marker
  const metaX = barX + (kpi.meta / 100) * barW;
  doc.setDrawColor(...C_BLACK);
  doc.setLineWidth(0.8);
  doc.line(metaX, barY - 1.5, metaX, barY + barH + 1.5);

  // Status text
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C_BLACK);
  doc.text(metReached ? "META ALCANZADA" : "META NO ALCANZADA", barX + barW, y + 27, { align: "right" });

  y += 32;
  return y;
}
