import jsPDF from "jspdf";
import { supabase } from "@/utils/dbClient";

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

interface RubricaModule {
  id: string;
  module_number: number;
  title: string;
  objective: string;
}

interface RubricaItem {
  id: string;
  module_id: string;
  item_type: string;
  item_label: string;
  desc_avanzado: string;
  desc_intermedio: string;
  desc_basico: string;
  desc_sin_evidencia: string;
  sort_order: number;
}

const NIVELES = ["Avanzado", "Intermedio", "Básico", "Sin evidencia"];

export async function generarPDFRubricaEnBlanco(
  logoSources: { logoRLT: string; logoCLTDark: string; logoCosmo: string },
  logoFlags: { showLogoRlt?: boolean; showLogoClt?: boolean } = {}
): Promise<void> {
  const showRlt = logoFlags.showLogoRlt ?? true;
  const showClt = logoFlags.showLogoClt ?? true;

  // Fetch rubrica data from DB
  const [modulesRes, itemsRes] = await Promise.all([
    supabase.from("rubrica_modules").select("*").order("sort_order"),
    supabase.from("rubrica_items").select("*").order("sort_order"),
  ]);

  const modules = (modulesRes.data ?? []) as RubricaModule[];
  const allItems = (itemsRes.data ?? []) as RubricaItem[];

  if (modules.length === 0) throw new Error("No rubrica modules found");

  const [rltB64, cltB64, cosmoB64, cosmoSize] = await Promise.all([
    showRlt ? loadImageAsBase64(logoSources.logoRLT) : Promise.resolve(""),
    showClt ? loadImageAsBase64(logoSources.logoCLTDark) : Promise.resolve(""),
    loadImageAsBase64(logoSources.logoCosmo),
    getImageNaturalSize(logoSources.logoCosmo),
  ]);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentW = pageW - margin * 2;
  let y = 0;

  const drawLogos = () => {
    const logoH = 14;
    const logoW = 18;
    const logoY = 6;
    if (showRlt && rltB64) doc.addImage(rltB64, "PNG", margin, logoY, logoW, logoH);
    if (showClt && cltB64) doc.addImage(cltB64, "PNG", pageW - margin - logoW, logoY, logoW, logoH);
  };

  const drawHeader = () => {
    drawLogos();
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("RÚBRICA DE EVALUACIÓN — FORMULARIO EN BLANCO", pageW / 2, 24, { align: "center" });
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.4);
    doc.line(pageW / 2 - 60, 27, pageW / 2 + 60, 27);
    y = 33;
  };

  const drawPageHeader = () => {
    drawLogos();
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("RÚBRICA DE EVALUACIÓN — FORMULARIO EN BLANCO", pageW / 2, 24, { align: "center" });
    y = 30;
  };

  const checkNewPage = (needed = 10) => {
    if (y + needed > pageH - 15) {
      doc.addPage();
      drawPageHeader();
    }
  };

  // ── Cover info ──
  drawHeader();

  // Directivo info fields
  const drawBlankField = (label: string) => {
    checkNewPage(7);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin + 2, y);
    const lw = doc.getTextWidth(`${label}:`) + 3;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(margin + 2 + lw, y + 1, margin + contentW * 0.5, y + 1);
    y += 6;
  };

  drawBlankField("Nombre del directivo");
  drawBlankField("Número de cédula");
  drawBlankField("Institución Educativa");
  drawBlankField("Fecha");
  y += 3;

  // ── Module tables ──
  modules.forEach((mod) => {
    const items = allItems.filter((it) => it.module_id === mod.id);
    if (items.length === 0) return;

    // Module title
    checkNewPage(20);
    doc.setFillColor(60, 60, 60);
    doc.rect(margin, y, contentW, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`MÓDULO ${mod.module_number}: ${mod.title.toUpperCase()}`, pageW / 2, y + 5, { align: "center" });
    y += 9;

    // Objective
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "italic");
    const objLines = doc.splitTextToSize(`Objetivo: ${mod.objective}`, contentW - 4);
    checkNewPage(objLines.length * 3 + 2);
    doc.text(objLines, margin + 2, y);
    y += objLines.length * 3 + 3;

    // Column headers
    const labelColW = contentW * 0.14;
    const nivelColW = (contentW - labelColW) / 4;

    checkNewPage(10);
    doc.setFillColor(200, 200, 200);
    doc.rect(margin, y, labelColW, 7, "F");
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("Ítem", margin + labelColW / 2, y + 5, { align: "center" });

    NIVELES.forEach((nivel, i) => {
      const x = margin + labelColW + i * nivelColW;
      doc.setFillColor(200, 200, 200);
      doc.rect(x, y, nivelColW, 7, "F");
      doc.text(nivel, x + nivelColW / 2, y + 5, { align: "center" });
    });
    y += 8;

    // Items
    items.forEach((item) => {
      const descs = [item.desc_avanzado, item.desc_intermedio, item.desc_basico, item.desc_sin_evidencia];

      // Calculate row height based on longest description
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      let maxLines = 1;
      descs.forEach((d) => {
        const lines = doc.splitTextToSize(d, nivelColW - 4);
        maxLines = Math.max(maxLines, lines.length);
      });
      const rowH = Math.max(maxLines * 2.8 + 4, 10);

      checkNewPage(rowH + 2);

      // Item label
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y, labelColW, rowH, "F");
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.rect(margin, y, labelColW, rowH, "S");
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      const labelLines = doc.splitTextToSize(item.item_label, labelColW - 4);
      doc.text(labelLines, margin + 2, y + 4);

      // Level descriptions with checkbox
      descs.forEach((desc, i) => {
        const x = margin + labelColW + i * nivelColW;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.rect(x, y, nivelColW, rowH, "S");

        // Checkbox square
        doc.setDrawColor(120, 120, 120);
        doc.setLineWidth(0.3);
        doc.rect(x + nivelColW - 6, y + 2, 3, 3, "S");

        // Description text
        doc.setFontSize(5.5);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(desc, nivelColW - 4);
        doc.text(lines, x + 2, y + 4);
      });

      y += rowH;
    });

    // Comment area
    checkNewPage(12);
    y += 2;
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text("Comentarios:", margin + 2, y);
    y += 3;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    for (let i = 0; i < 2; i++) {
      doc.line(margin + 4, y, margin + contentW, y);
      y += 5;
    }
    y += 4;
  });

  // ── Footers ──
  const totalPages = (doc.internal as any).getNumberOfPages?.() ?? 1;
  const cosmoTargetH = 7;
  const cosmoLogoW = cosmoTargetH * (cosmoSize.width / cosmoSize.height);

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const cosmoY = pageH - 12;
    doc.addImage(cosmoB64, "PNG", margin, cosmoY, cosmoLogoW, cosmoTargetH);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`${i}/${totalPages}`, pageW - margin, cosmoY + cosmoTargetH / 2 + 1, { align: "right" });
  }

  doc.save("Rubrica_Evaluacion_En_Blanco.pdf");
}
