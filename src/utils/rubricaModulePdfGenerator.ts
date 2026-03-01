import jsPDF from "jspdf";

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

const NIVEL_LABELS: Record<string, string> = {
  avanzado: "Avanzado",
  intermedio: "Intermedio",
  basico: "Básico",
  sin_evidencia: "Sin evidencia",
};

export interface RubricaModuleReportData {
  directivoNombre: string;
  directivoCedula: string;
  institucion: string;
  moduleNumber: number;
  moduleTitle: string;
  moduleObjective: string;
  items: {
    itemType: string;
    itemLabel: string;
    directivoNivel: string | null;
    directivoComentario: string | null;
    equipoNivel: string | null;
    equipoComentario: string | null;
    acordadoNivel: string | null;
    acordadoComentario: string | null;
  }[];
  seguimientos?: {
    itemLabel: string;
    nivel: string | null;
    comentario: string | null;
    fecha: string;
  }[];
}

export interface RubricaModulePdfLogos {
  logoRLT: string;
  logoCosmo: string;
}

export async function generarPDFRubricaModulo(
  data: RubricaModuleReportData,
  logoSources: RubricaModulePdfLogos,
  options: { returnBlob?: boolean } = {}
): Promise<Blob | void> {
  const [rltB64, cosmoB64] = await Promise.all([
    loadImageAsBase64(logoSources.logoRLT),
    loadImageAsBase64(logoSources.logoCosmo),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 0;

  const addFooter = () => {
    const footerY = pageH - 15;
    try { doc.addImage(cosmoB64, "PNG", margin, footerY - 4, 20, 8); } catch {}
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Página ${doc.getNumberOfPages()}`,
      pageW - margin,
      footerY,
      { align: "right" }
    );
  };

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageH - 25) {
      addFooter();
      doc.addPage();
      y = 25;
    }
  };

  // ── COVER PAGE ──
  y = 30;
  try { doc.addImage(rltB64, "PNG", margin, y, 40, 16); } catch {}
  y += 25;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("INFORME DE RÚBRICA", pageW / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(14);
  doc.setTextColor(80, 80, 80);
  doc.text(`Módulo ${data.moduleNumber}: ${data.moduleTitle}`, pageW / 2, y, { align: "center" });
  y += 15;

  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");

  const infoLines = [
    `Directivo: ${data.directivoNombre}`,
    `Cédula: ${data.directivoCedula}`,
    `Institución: ${data.institucion}`,
    `Fecha: ${new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}`,
  ];
  for (const line of infoLines) {
    doc.text(line, pageW / 2, y, { align: "center" });
    y += 7;
  }

  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const objLines = doc.splitTextToSize(`Objetivo: ${data.moduleObjective}`, contentW - 20);
  doc.text(objLines, pageW / 2, y, { align: "center" });

  addFooter();

  // ── DETAIL PAGES ──
  doc.addPage();
  y = 25;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("DETALLE POR ÍTEM", margin, y);
  y += 10;

  for (const item of data.items) {
    checkPageBreak(70);

    // Item header
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    const typePrefix = item.itemType === "proceso" ? "Proceso" : "Producto";
    doc.text(`${typePrefix}: ${item.itemLabel}`, margin, y);
    y += 7;

    // Three columns: Directivo, Equipo, Acordado
    const colW = (contentW - 6) / 3;
    const columns = [
      { title: "AUTOEVALUACIÓN", nivel: item.directivoNivel, comentario: item.directivoComentario },
      { title: "EVALUACIÓN EQUIPO", nivel: item.equipoNivel, comentario: item.equipoComentario },
      { title: "NIVEL ACORDADO", nivel: item.acordadoNivel, comentario: item.acordadoComentario },
    ];

    const startY = y;
    let maxH = 0;

    for (let ci = 0; ci < columns.length; ci++) {
      const col = columns[ci];
      const x = margin + ci * (colW + 3);
      let colY = startY;

      // Column title
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text(col.title, x + 2, colY + 4);
      colY += 7;

      // Nivel badge
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      const nivelText = col.nivel ? NIVEL_LABELS[col.nivel] || col.nivel : "—";
      doc.text(nivelText, x + 2, colY + 4);
      colY += 7;

      // Comment
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      const comment = col.comentario || "Sin comentario";
      const lines = doc.splitTextToSize(comment, colW - 4);
      doc.text(lines, x + 2, colY + 4);
      colY += lines.length * 3.5 + 6;

      const colH = colY - startY;
      if (colH > maxH) maxH = colH;

      // Draw column border
      doc.setDrawColor(200, 200, 200);
      doc.rect(x, startY, colW, Math.max(colH, 30));
    }

    y = startY + Math.max(maxH, 30) + 6;
  }

  // ── SEGUIMIENTOS (if any) ──
  if (data.seguimientos && data.seguimientos.length > 0) {
    checkPageBreak(30);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("SEGUIMIENTOS", margin, y);
    y += 8;

    for (const seg of data.seguimientos) {
      checkPageBreak(25);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text(`${seg.itemLabel}`, margin, y);
      y += 5;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      const nivelText = seg.nivel ? NIVEL_LABELS[seg.nivel] || seg.nivel : "—";
      doc.text(`Nivel: ${nivelText}  |  Fecha: ${new Date(seg.fecha).toLocaleDateString("es-CO")}`, margin, y);
      y += 4;

      if (seg.comentario) {
        doc.setTextColor(60, 60, 60);
        const lines = doc.splitTextToSize(seg.comentario, contentW);
        doc.text(lines, margin, y);
        y += lines.length * 3.5 + 3;
      }
      y += 3;
    }
  }

  addFooter();

  if (options.returnBlob) {
    return doc.output("blob");
  }

  doc.save(`Informe_Rubrica_M${data.moduleNumber}_${data.directivoCedula}.pdf`);
}
