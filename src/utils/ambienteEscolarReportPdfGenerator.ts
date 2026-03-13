import jsPDF from "jspdf";
import { FREQUENCY_OPTIONS } from "@/data/ambienteEscolarData";
import {
  SAN_COLORS,
  SAN_LABELS,
  SECTION_NAMES,
  CROSS_ACTOR_ITEMS,
  REPORT_INTRO_TEXT,
  COMPONENTE_COMUNICACION,
  COMPONENTE_PRACTICAS,
  COMPONENTE_CONVIVENCIA,
  REPORT_STRUCTURE_TEXT,
  LIKERT_BY_ROLE,
  getQuestionText,
  type SectionName,
} from "@/data/ambienteEscolarReportData";
import { loadImageAsBase64, getImageNaturalSize, logoDims, COVER_LOGO_H, FOOTER_COSMO_H } from "@/utils/pdfLogoHelper";

// ── Types ──
export interface AmbienteReportData {
  institucion: string;
  entidadTerritorial: string;
  submissions: {
    tipo_formulario: string;
    respuestas: Record<string, string>;
  }[];
}

interface LogoSources {
  logoRLT: string;
  logoCLT: string;
  logoCosmo?: string;
}

type SANKey = "S" | "A" | "N";

// ── Compute S/A/N percentages ──
function computeSAN(
  submissions: AmbienteReportData["submissions"],
  role: string,
  sectionTitle: string
): { S: number; A: number; N: number; total: number } {
  const sections = LIKERT_BY_ROLE[role];
  if (!sections) return { S: 0, A: 0, N: 0, total: 0 };
  const sec = sections.find((s) => s.title === sectionTitle);
  if (!sec) return { S: 0, A: 0, N: 0, total: 0 };

  const roleSubs = submissions.filter((s) => s.tipo_formulario === role);
  let sCount = 0, aCount = 0, nCount = 0, total = 0;

  for (const sub of roleSubs) {
    for (const item of sec.items) {
      const val = sub.respuestas?.[item.id];
      if (!val) continue;
      total++;
      if (val === "Siempre" || val === "Casi siempre") sCount++;
      else if (val === "A veces") aCount++;
      else if (val === "Casi nunca" || val === "Nunca") nCount++;
    }
  }

  if (total === 0) return { S: 0, A: 0, N: 0, total: 0 };
  return {
    S: Math.round((sCount / total) * 100),
    A: Math.round((aCount / total) * 100),
    N: Math.round((nCount / total) * 100),
    total,
  };
}

// ── Compute S/A/N for a single item ID within a role ──
function computeItemSAN(
  submissions: AmbienteReportData["submissions"],
  role: string,
  itemId: string
): { S: number; A: number; N: number; total: number } {
  const roleSubs = submissions.filter((s) => s.tipo_formulario === role);
  let sCount = 0, aCount = 0, nCount = 0, total = 0;

  for (const sub of roleSubs) {
    const val = sub.respuestas?.[itemId];
    if (!val) continue;
    total++;
    if (val === "Siempre" || val === "Casi siempre") sCount++;
    else if (val === "A veces") aCount++;
    else if (val === "Casi nunca" || val === "Nunca") nCount++;
  }

  if (total === 0) return { S: 0, A: 0, N: 0, total: 0 };
  return {
    S: Math.round((sCount / total) * 100),
    A: Math.round((aCount / total) * 100),
    N: Math.round((nCount / total) * 100),
    total,
  };
}

// ── Draw a pie chart on a temporary canvas, return data URL ──
function drawPieChart(
  data: { label: string; value: number; color: string }[],
  size: number = 200
): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2, cy = size / 2, r = size / 2 - 10;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return canvas.toDataURL("image/png");

  let startAngle = -Math.PI / 2;
  for (const d of data) {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = d.color;
    ctx.fill();
    // Label
    if (d.value > 0) {
      const midAngle = startAngle + sliceAngle / 2;
      const lx = cx + (r * 0.65) * Math.cos(midAngle);
      const ly = cy + (r * 0.65) * Math.sin(midAngle);
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.round(size / 12)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const pct = Math.round((d.value / total) * 100);
      if (pct >= 5) ctx.fillText(`${pct}%`, lx, ly);
    }
    startAngle += sliceAngle;
  }
  return canvas.toDataURL("image/png");
}

// ── Main Generator ──
export async function generarAmbienteEscolarReportPDF(
  data: AmbienteReportData,
  logoSources: LogoSources,
  logoFlags: { showLogoRlt?: boolean; showLogoClt?: boolean } = {},
  options: { returnBlob?: boolean } = {}
): Promise<Blob | void> {
  const showRlt = logoFlags.showLogoRlt ?? true;
  const showClt = logoFlags.showLogoClt ?? true;
  const cosmoSrc = logoSources.logoCosmo || (await import("@/assets/logo_cosmo.png")).default;

  const [rltB64, cltB64, cosmoB64, cosmoSize] = await Promise.all([
    showRlt ? loadImageAsBase64(logoSources.logoRLT) : Promise.resolve(""),
    showClt ? loadImageAsBase64(logoSources.logoCLT) : Promise.resolve(""),
    loadImageAsBase64(cosmoSrc),
    getImageNaturalSize(cosmoSrc),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Helpers ──
  const pxToMm = 25.4 / 96 * 0.50;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 20) {
      doc.addPage();
      drawPageHeader();
    }
  };

  const drawPageHeader = () => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Programa RLT y CLT", margin, 10);
    doc.text("Encuesta de Ambiente Escolar", pageW - margin, 10, { align: "right" });
    y = 18;
  };

  const drawPageFooter = (pageNum: number) => {
    const cosmoH = 7;
    const cosmoW = cosmoH * (cosmoSize.width / cosmoSize.height);
    const fY = pageH - 12;
    if (cosmoB64) doc.addImage(cosmoB64, "PNG", margin, fY, cosmoW, cosmoH);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`${pageNum}`, pageW - margin, fY + cosmoH / 2 + 1, { align: "right" });
  };

  const wrapText = (text: string, maxW: number, fontSize: number): string[] => {
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(text, maxW) as string[];
  };

  const ROLES = ["docentes", "estudiantes", "acudientes"] as const;
  const ROLE_LABELS: Record<string, string> = {
    docentes: "Docentes",
    estudiantes: "Estudiantes",
    acudientes: "Acudientes",
  };
  const ROLE_COLORS: Record<string, [number, number, number]> = {
    docentes: [41, 98, 255],
    estudiantes: [255, 152, 0],
    acudientes: [156, 39, 176],
  };

  const roleCounts: Record<string, number> = {};
  for (const r of ROLES) {
    roleCounts[r] = data.submissions.filter((s) => s.tipo_formulario === r).length;
  }

  // ════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ════════════════════════════════════════════════════════════
  // Logos
  if (showRlt && rltB64) {
    const rltSize = await getImageNaturalSize(logoSources.logoRLT);
    const rltW = rltSize.width * pxToMm;
    const rltH = rltSize.height * pxToMm;
    if (showClt) {
      doc.addImage(rltB64, "PNG", margin, 20, rltW, rltH);
    } else {
      doc.addImage(rltB64, "PNG", (pageW - rltW) / 2, 20, rltW, rltH);
    }
  }
  if (showClt && cltB64) {
    const cltSize = await getImageNaturalSize(logoSources.logoCLT);
    const cltW = cltSize.width * pxToMm;
    const cltH = cltSize.height * pxToMm;
    if (showRlt) {
      doc.addImage(cltB64, "PNG", pageW - margin - cltW, 20, cltW, cltH);
    } else {
      doc.addImage(cltB64, "PNG", (pageW - cltW) / 2, 20, cltW, cltH);
    }
  }

  y = 70;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PROGRAMA", pageW / 2, y, { align: "center" });
  y += 7;
  doc.text("RECTORES LÍDERES TRANSFORMADORES", pageW / 2, y, { align: "center" });
  y += 7;
  doc.text("COORDINADORES LÍDERES TRANSFORMADORES", pageW / 2, y, { align: "center" });

  y += 25;
  doc.setFontSize(24);
  doc.setTextColor(60, 60, 60);
  doc.text("Encuesta de", pageW / 2, y, { align: "center" });
  y += 12;
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text("Ambiente Escolar", pageW / 2, y, { align: "center" });

  y += 20;
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  doc.text("INFORME DE RESULTADOS", pageW / 2, y, { align: "center" });

  // Institution name on blue background
  y += 20;
  const boxH = 18;
  doc.setFillColor(26, 58, 107);
  doc.rect(margin, y, contentW, boxH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const instLines = doc.splitTextToSize(data.institucion, contentW - 10);
  const instY = y + (boxH - instLines.length * 6) / 2 + 5;
  doc.text(instLines, pageW / 2, instY, { align: "center" });

  y += boxH + 10;
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  if (data.entidadTerritorial) {
    doc.text(data.entidadTerritorial, pageW / 2, y, { align: "center" });
  }

  // Cosmo logo at bottom
  const cosmoH = 12;
  const cosmoW = cosmoH * (cosmoSize.width / cosmoSize.height);
  if (cosmoB64) {
    doc.addImage(cosmoB64, "PNG", (pageW - cosmoW) / 2, pageH - 30, cosmoW, cosmoH);
  }

  // ════════════════════════════════════════════════════════════
  // PAGE 2 — EXPLANATORY
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  drawPageHeader();
  let pageNum = 2;

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("ENCUESTA DE AMBIENTE ESCOLAR", pageW / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const introLines = wrapText(REPORT_INTRO_TEXT, contentW, 10);
  doc.text(introLines, margin, y);
  y += introLines.length * 4.5 + 8;

  // Components
  const components = [
    { title: "1. Comunicación", text: COMPONENTE_COMUNICACION },
    { title: "2. Prácticas Pedagógicas", text: COMPONENTE_PRACTICAS },
    { title: "3. Convivencia", text: COMPONENTE_CONVIVENCIA },
  ];

  for (const comp of components) {
    ensureSpace(30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 58, 107);
    doc.text(comp.title, margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    const lines = wrapText(comp.text, contentW, 9);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 6;
  }

  // Report structure
  ensureSpace(30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 58, 107);
  doc.text("Estructura del informe", margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  const structLines = wrapText(REPORT_STRUCTURE_TEXT, contentW, 9);
  doc.text(structLines, margin, y);
  y += structLines.length * 4 + 6;

  drawPageFooter(pageNum);

  // ════════════════════════════════════════════════════════════
  // PAGE 3 — ENCUESTADOS (Demographics)
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  drawPageHeader();
  pageNum++;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 58, 107);
  doc.text("ENCUESTADOS", margin, y);
  y += 8;

  for (const role of ROLES) {
    ensureSpace(25);
    const count = roleCounts[role];
    const color = ROLE_COLORS[role];

    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(margin, y, contentW, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${ROLE_LABELS[role]}: ${count} respuesta(s)`, margin + 4, y + 5.5);
    y += 12;

    if (count === 0) {
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text("Sin respuestas para este tipo de actor.", margin + 4, y);
      y += 8;
      continue;
    }

    // Demographic: Jornada pie chart
    const roleSubs = data.submissions.filter((s) => s.tipo_formulario === role);
    const jornadaCounts: Record<string, number> = {};
    for (const sub of roleSubs) {
      const j = sub.respuestas?.jornada || "Sin dato";
      jornadaCounts[j] = (jornadaCounts[j] || 0) + 1;
    }

    const pieColors = ["#2196F3", "#FF9800", "#4CAF50", "#9C27B0", "#F44336", "#607D8B"];
    const pieData = Object.entries(jornadaCounts).map(([label, value], i) => ({
      label, value, color: pieColors[i % pieColors.length],
    }));
    const pieDataUrl = drawPieChart(pieData, 200);

    doc.addImage(pieDataUrl, "PNG", margin, y, 35, 35);

    // Legend next to pie
    let ly = y + 2;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Jornada:", margin + 40, ly);
    ly += 5;
    doc.setFont("helvetica", "normal");
    for (const d of pieData) {
      doc.setFillColor(d.color);
      doc.rect(margin + 40, ly - 2.5, 3, 3, "F");
      doc.text(`${d.label}: ${d.value}`, margin + 45, ly);
      ly += 4;
    }

    y += 40;
  }

  drawPageFooter(pageNum);

  // ════════════════════════════════════════════════════════════
  // PAGE 4 — RESUMEN GENERAL (S/A/N bars)
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  drawPageHeader();
  pageNum++;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 58, 107);
  doc.text("RESUMEN GENERAL", margin, y);
  y += 10;

  // Legend
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const legendX = margin;
  const legendItems: { key: SANKey; label: string }[] = [
    { key: "S", label: SAN_LABELS.S },
    { key: "A", label: SAN_LABELS.A },
    { key: "N", label: SAN_LABELS.N },
  ];
  let lx = legendX;
  for (const li of legendItems) {
    const c = SAN_COLORS[li.key];
    doc.setFillColor(c[0], c[1], c[2]);
    doc.rect(lx, y - 2.5, 4, 3, "F");
    doc.setTextColor(30, 30, 30);
    doc.text(li.label, lx + 6, y);
    lx += doc.getTextWidth(li.label) + 12;
  }
  y += 8;

  for (const role of ROLES) {
    ensureSpace(50);
    const color = ROLE_COLORS[role];
    const count = roleCounts[role];

    // Role header
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(margin, y, contentW, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`${ROLE_LABELS[role]} (n=${count})`, margin + 3, y + 5);
    y += 10;

    if (count === 0) {
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("Sin respuestas", margin + 3, y);
      y += 8;
      continue;
    }

    // Stacked bars per section
    const barH = 8;
    const labelW = 55;
    const barW = contentW - labelW - 5;

    for (const sec of SECTION_NAMES) {
      const san = computeSAN(data.submissions, role, sec);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(sec, margin, y + barH / 2 + 1);

      let bx = margin + labelW;
      for (const key of ["S", "A", "N"] as SANKey[]) {
        const pct = san[key];
        const w = (pct / 100) * barW;
        if (w > 0) {
          const c = SAN_COLORS[key];
          doc.setFillColor(c[0], c[1], c[2]);
          doc.rect(bx, y, w, barH, "F");
          if (w > 8) {
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(7);
            doc.text(`${pct}%`, bx + w / 2, y + barH / 2 + 1, { align: "center" });
          }
          bx += w;
        }
      }

      y += barH + 3;
    }

    y += 5;
  }

  // Instruction box
  ensureSpace(20);
  doc.setDrawColor(220, 53, 69);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentW, 14);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(220, 53, 69);
  const instrText = "Los ítems con porcentaje de \"Siempre/Casi siempre\" inferior al 50% se destacan en naranja en las páginas siguientes como retos potenciales para el directivo.";
  const instrLines = wrapText(instrText, contentW - 8, 8);
  doc.text(instrLines, margin + 4, y + 5);
  y += 18;

  drawPageFooter(pageNum);

  // ════════════════════════════════════════════════════════════
  // PAGES 5+ — FORTALEZAS Y RETOS (detailed tables)
  // ════════════════════════════════════════════════════════════
  for (const section of SECTION_NAMES) {
    doc.addPage();
    drawPageHeader();
    pageNum++;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 58, 107);
    doc.text(`FORTALEZAS Y RETOS — ${section.toUpperCase()}`, margin, y);
    y += 8;

    const items = CROSS_ACTOR_ITEMS.filter((i) => i.section === section);

    // Table header
    const col0W = contentW * 0.34; // neutral text
    const colGroupW = (contentW - col0W) / 3; // per role
    const colSanW = colGroupW / 3;

    ensureSpace(12);
    // Header row
    doc.setFillColor(60, 60, 60);
    doc.rect(margin, y, contentW, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("Ítem", margin + 2, y + 5);

    let hx = margin + col0W;
    for (const role of ROLES) {
      const rc = ROLE_COLORS[role];
      doc.setFillColor(rc[0], rc[1], rc[2]);
      doc.rect(hx, y, colGroupW, 4, "F");
      doc.setTextColor(255, 255, 255);
      doc.text(ROLE_LABELS[role], hx + colGroupW / 2, y + 3, { align: "center" });

      // Sub-headers S/A/N
      doc.setFillColor(80, 80, 80);
      doc.rect(hx, y + 4, colGroupW, 4, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      const sanLabels = ["S", "A", "N"];
      for (let si = 0; si < 3; si++) {
        doc.text(sanLabels[si], hx + si * colSanW + colSanW / 2, y + 7, { align: "center" });
      }
      hx += colGroupW;
    }
    y += 10;

    // Data rows
    for (const item of items) {
      const rowH = 14;
      ensureSpace(rowH + 2);

      // Neutral text
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      const textLines = wrapText(item.neutralText, col0W - 4, 7);
      doc.text(textLines, margin + 2, y + 4);

      // S/A/N values per role
      let cx = margin + col0W;
      for (const role of ROLES) {
        const itemId = item[role as keyof typeof item] as string | undefined;
        if (itemId) {
          const san = computeItemSAN(data.submissions, role, itemId);
          const sanVals = [san.S, san.A, san.N];
          for (let si = 0; si < 3; si++) {
            const val = sanVals[si];
            const cellX = cx + si * colSanW;

            // Orange highlight if S < 50%
            if (si === 0 && val < 50 && san.total > 0) {
              doc.setFillColor(255, 165, 0);
              doc.rect(cellX, y, colSanW, rowH, "F");
              doc.setTextColor(255, 255, 255);
            } else {
              doc.setTextColor(30, 30, 30);
            }

            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            if (san.total > 0) {
              doc.text(`${val}%`, cellX + colSanW / 2, y + 5, { align: "center" });
            } else {
              doc.setTextColor(150, 150, 150);
              doc.text("—", cellX + colSanW / 2, y + 5, { align: "center" });
            }
          }
        } else {
          // Role not applicable
          for (let si = 0; si < 3; si++) {
            doc.setTextColor(150, 150, 150);
            doc.setFontSize(7);
            doc.text("—", cx + si * colSanW + colSanW / 2, y + 5, { align: "center" });
          }
        }
        cx += colGroupW;
      }

      // Light border
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(margin, y + rowH, margin + contentW, y + rowH);

      y += rowH;
    }

    // Retos box
    y += 8;
    ensureSpace(40);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 58, 107);
    doc.text("RETOS PARA EL DIRECTIVO EVALUADO", margin, y);
    y += 6;
    doc.setDrawColor(26, 58, 107);
    doc.setLineWidth(0.5);
    const retosH = Math.min(40, pageH - y - 25);
    doc.rect(margin, y, contentW, retosH);
    // Lined area
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.15);
    for (let ly = y + 8; ly < y + retosH - 2; ly += 7) {
      doc.line(margin + 3, ly, margin + contentW - 3, ly);
    }

    drawPageFooter(pageNum);
  }

  // ── Output ──
  if (options.returnBlob) {
    return doc.output("blob");
  }
  const safeName = data.institucion.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, "").replace(/\s+/g, "_");
  doc.save(`Informe_Ambiente_Escolar_${safeName}.pdf`);
}
