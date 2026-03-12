/**
 * PDF generator for Satisfaction survey reports.
 * Generates a client-side PDF with:
 * - Cover page with programme logos + optional extra logos
 * - Ficha técnica
 * - Statistics per section (horizontal bars)
 * - General satisfaction summary
 */
import jsPDF from "jspdf";
import logoRLTWhite from "@/assets/logo_rlt_white.png";
import logoCLTWhite from "@/assets/logo_clt_white.png";
import logoCosmoWhite from "@/assets/logo_cosmo_white.png";
import logoRLTDark from "@/assets/logo_rlt.png";
import logoCLTDark from "@/assets/logo_clt_dark.png";
import logoCosmo from "@/assets/logo_cosmo.png";
import { FORM_TYPE_LABELS, SATISFACCION_FORMS } from "@/data/satisfaccionData";
import type { SatisfaccionFormDef } from "@/data/satisfaccionData";

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

interface SectionStat {
  title: string;
  type: "checkbox" | "grid" | "likert" | "other";
  data: { label: string; value: number; count: number }[];
}

export interface SatisfaccionPdfOptions {
  filterType: string;
  filterModule: string;
  filterRegion: string;
  responses: any[];
  showLogoRlt: boolean;
  showLogoClt: boolean;
  extraLogos: string[]; // base64 data URLs
  sectionStats: SectionStat[];
  generalSatisfaction: { label: string; value: number }[];
  overallSatisfaction: number;
}

export async function generateSatisfaccionPdf(opts: SatisfaccionPdfOptions): Promise<void> {
  const {
    filterType, filterModule, filterRegion, responses,
    showLogoRlt, showLogoClt, extraLogos,
    sectionStats, generalSatisfaction, overallSatisfaction,
  } = opts;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;

  // Load logos
  const [rltB64, cltB64, cosmoB64] = await Promise.all([
    showLogoRlt ? loadImageAsBase64(logoRLTWhite) : Promise.resolve(""),
    showLogoClt ? loadImageAsBase64(logoCLTWhite) : Promise.resolve(""),
    loadImageAsBase64(logoCosmoWhite),
  ]);

  const [rltDarkB64, cltDarkB64, cosmoDarkB64] = await Promise.all([
    showLogoRlt ? loadImageAsBase64(logoRLTDark) : Promise.resolve(""),
    showLogoClt ? loadImageAsBase64(logoCLTDark) : Promise.resolve(""),
    loadImageAsBase64(logoCosmo),
  ]);

  // ── Cover page ──
  // Dark background
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageW, pageH, "F");

  // Programme logos at top
  const logoH = 22;
  const logoW = 28;
  const logoY = 30;

  const activeProgrammeLogos: string[] = [];
  if (showRltLogo(rltB64)) activeProgrammeLogos.push(rltB64);
  if (showCltLogo(cltB64)) activeProgrammeLogos.push(cltB64);

  if (activeProgrammeLogos.length === 2) {
    doc.addImage(activeProgrammeLogos[0], "PNG", margin + 10, logoY, logoW, logoH);
    doc.addImage(activeProgrammeLogos[1], "PNG", pageW - margin - 10 - logoW, logoY, logoW, logoH);
  } else if (activeProgrammeLogos.length === 1) {
    doc.addImage(activeProgrammeLogos[0], "PNG", pageW / 2 - logoW / 2, logoY, logoW, logoH);
  }

  // Cosmo logo centered below programme logos
  if (cosmoB64) {
    const cosmoW = 35;
    const cosmoH = 14;
    doc.addImage(cosmoB64, "PNG", pageW / 2 - cosmoW / 2, logoY + logoH + 8, cosmoW, cosmoH);
  }

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  const titleY = logoY + logoH + 45;
  doc.text("Informe de Satisfacción", pageW / 2, titleY, { align: "center" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text(FORM_TYPE_LABELS[filterType] || filterType, pageW / 2, titleY + 12, { align: "center" });

  // Module + Region
  doc.setFontSize(12);
  const moduleLabel = filterModule === "all" ? "Todos los módulos" : `Módulo ${filterModule}`;
  const regionLabel = filterRegion === "all" ? "Todas las regiones" : filterRegion;
  doc.text(`${moduleLabel} — ${regionLabel}`, pageW / 2, titleY + 26, { align: "center" });

  // Date
  doc.setFontSize(10);
  doc.text(new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }), pageW / 2, titleY + 38, { align: "center" });

  // Extra logos at bottom of cover page
  if (extraLogos.length > 0) {
    const extraY = pageH - 50;
    const extraH = 20;
    const totalW = extraLogos.length * 30 + (extraLogos.length - 1) * 8;
    let startX = pageW / 2 - totalW / 2;
    for (const logo of extraLogos) {
      try {
        doc.addImage(logo, "PNG", startX, extraY, 30, extraH);
      } catch { /* skip invalid */ }
      startX += 38;
    }
  }

  // ── Page 2+: Content pages ──
  doc.addPage();

  // Header for content pages
  const drawContentHeader = () => {
    const hLogoH = 12;
    const hLogoW = 16;
    const hY = 8;
    if (showLogoRlt && rltDarkB64) {
      doc.addImage(rltDarkB64, "PNG", margin, hY, hLogoW, hLogoH);
    }
    if (showLogoClt && cltDarkB64) {
      doc.addImage(cltDarkB64, "PNG", pageW - margin - hLogoW, hY, hLogoW, hLogoH);
    }
    return hY + hLogoH + 5;
  };

  let y = drawContentHeader();

  // Footer
  const drawFooter = (pageNum: number) => {
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${pageNum}`, pageW / 2, pageH - 8, { align: "center" });
    doc.setTextColor(30, 30, 30);
  };

  const checkPageBreak = (needed: number): number => {
    if (y + needed > pageH - 20) {
      drawFooter(doc.getNumberOfPages());
      doc.addPage();
      y = drawContentHeader();
    }
    return y;
  };

  // Ficha técnica
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Ficha Técnica", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const fichaRows = [
    ["Tipo de encuesta", FORM_TYPE_LABELS[filterType] || filterType],
    ["Módulo", moduleLabel],
    ["Región", regionLabel],
    ["Total de respuestas", String(responses.length)],
  ];

  for (const [label, value] of fichaRows) {
    doc.setFont("helvetica", "bold");
    doc.text(label + ":", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 50, y);
    y += 6;
  }

  y += 8;

  // Sections
  for (const section of sectionStats) {
    y = checkPageBreak(30);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(section.title, margin, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);

    for (const item of section.data) {
      y = checkPageBreak(12);

      // Label (wrapped)
      const lines = doc.splitTextToSize(item.label, contentW - 45);
      doc.text(lines, margin, y);
      const lineH = lines.length * 4;

      // Bar
      const barX = margin + contentW - 40;
      const barW = 35;
      const barH = 4;
      const barY = y - 3;
      // Background
      doc.setFillColor(230, 230, 230);
      doc.rect(barX, barY, barW, barH, "F");
      // Fill
      const fillW = (item.value / 100) * barW;
      if (item.value >= 80) {
        doc.setFillColor(34, 197, 94); // green
      } else if (item.value >= 60) {
        doc.setFillColor(59, 130, 246); // blue
      } else if (item.value >= 40) {
        doc.setFillColor(251, 191, 36); // amber
      } else {
        doc.setFillColor(239, 68, 68); // red
      }
      doc.rect(barX, barY, fillW, barH, "F");

      // Percentage text
      doc.setFontSize(8);
      doc.text(`${item.value}%`, barX + barW + 2, barY + 3.5);
      doc.setFontSize(9);

      y += Math.max(lineH, 6) + 2;
    }

    y += 5;
  }

  // General satisfaction
  if (generalSatisfaction.length > 0) {
    y = checkPageBreak(40);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Nivel General de Satisfacción", margin, y);
    y += 10;

    doc.setFontSize(22);
    doc.setTextColor(34, 97, 184);
    doc.text(`${overallSatisfaction}%`, pageW / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);

    for (const gs of generalSatisfaction) {
      y = checkPageBreak(10);
      const lines = doc.splitTextToSize(gs.label, contentW - 30);
      doc.text(lines, margin, y);
      doc.setFont("helvetica", "bold");
      doc.text(`${gs.value}%`, pageW - margin, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += lines.length * 4 + 3;
    }
  }

  // Final footer
  drawFooter(doc.getNumberOfPages());

  // Download
  const formLabel = FORM_TYPE_LABELS[filterType] || filterType;
  const modLabel = filterModule === "all" ? "todos" : `mod${filterModule}`;
  const regLabel = filterRegion === "all" ? "todas" : filterRegion.replace(/\s+/g, "_");
  doc.save(`satisfaccion_${formLabel}_${modLabel}_${regLabel}.pdf`);
}

function showRltLogo(b64: string): boolean {
  return b64 !== "";
}
function showCltLogo(b64: string): boolean {
  return b64 !== "";
}
