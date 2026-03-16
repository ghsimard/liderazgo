import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Draws a centered title page with IP notice.
 */
function addTitlePage(
  doc: jsPDF,
  logoRLT: string,
  logoCosmo: string,
) {
  const pdfW = 210;
  const pdfH = 297;
  const centerX = pdfW / 2;

  // Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pdfW, pdfH, "F");

  // Logos side by side
  const logoW = 40;
  const logoH = 20;
  const logoGap = 10;
  const logosStartX = centerX - (logoW * 2 + logoGap) / 2;

  try {
    doc.addImage(logoRLT, "PNG", logosStartX, 40, logoW, logoH);
    doc.addImage(logoCosmo, "PNG", logosStartX + logoW + logoGap, 40, logoW, logoH);
  } catch {
    // logos optional
  }

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(30, 30, 30);
  doc.text("Especificaciones de la Plataforma", centerX, 95, { align: "center" });
  doc.text("RLT / CLT", centerX, 110, { align: "center" });

  // Divider line
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.5);
  doc.line(50, 120, pdfW - 50, 120);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(80, 80, 80);
  doc.text("Documento de Especificaciones Tecnicas", centerX, 135, { align: "center" });

  // Date
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  doc.setFontSize(11);
  doc.text(dateStr, centerX, 150, { align: "center" });

  // IP Notice box
  const boxX = 30;
  const boxY = 175;
  const boxW = pdfW - 60;
  const boxH = 80;

  doc.setFillColor(248, 248, 248);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("AVISO DE PROPIEDAD INTELECTUAL", centerX, boxY + 14, { align: "center" });

  doc.setDrawColor(180, 180, 180);
  doc.line(boxX + 10, boxY + 19, boxX + boxW - 10, boxY + 19);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(50, 50, 50);

  const notice = [
    "Este documento es propiedad intelectual exclusiva de Ghislain Simard",
    "(CE 6798900). Todos los derechos estan reservados.",
    "",
    "Queda estrictamente prohibida la reproduccion, distribucion,",
    "modificacion, transmision o utilizacion total o parcial de este",
    "documento y de su contenido, en cualquier forma o por cualquier",
    "medio, sin el consentimiento previo, expreso y por escrito del autor.",
    "",
    "El uso no autorizado de estas especificaciones constituye una",
    "violacion de los derechos de propiedad intelectual aplicables.",
  ];

  let textY = boxY + 28;
  for (const line of notice) {
    doc.text(line, centerX, textY, { align: "center" });
    textY += 5;
  }

  // Author at bottom
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text("Autor: Ghislain Simard  |  CE 6798900", centerX, pdfH - 30, { align: "center" });
}

/**
 * Generates a PDF that is visually identical to the web page
 * by capturing the rendered HTML element with html2canvas.
 */
export async function generarPDFSpecifications(
  _markdownContent: string,
  logoSources: { logoRLT: string; logoCosmo: string },
  articleElement?: HTMLElement | null,
): Promise<void> {
  if (!articleElement) {
    throw new Error("Article element is required for PDF generation");
  }

  // Capture the rendered article as a high-res canvas
  const canvas = await html2canvas(articleElement, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    onclone: (clonedDoc) => {
      const el = clonedDoc.body.querySelector("[data-pdf-target]") as HTMLElement;
      if (el) {
        el.style.width = "800px";
        el.style.maxWidth = "800px";
        el.style.padding = "40px";
      }
    },
  });

  // PDF dimensions (A4)
  const pdfW = 210;
  const pdfH = 297;
  const marginX = 10;
  const marginY = 10;
  const usableW = pdfW - marginX * 2;
  const usableH = pdfH - marginY * 2;

  // Scale canvas to fit PDF width
  const imgW = canvas.width;
  const imgH = canvas.height;
  const ratio = usableW / imgW;
  const scaledH = imgH * ratio;

  const pageContentH = usableH;
  const totalPages = Math.ceil(scaledH / pageContentH) + 1; // +1 for title page

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // --- Title page ---
  addTitlePage(doc, logoSources.logoRLT, logoSources.logoCosmo);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`1 / ${totalPages}`, pdfW - marginX, pdfH - 5, { align: "right" });

  // --- Content pages ---
  const contentPages = totalPages - 1;
  for (let page = 0; page < contentPages; page++) {
    doc.addPage();

    const srcY = (page * pageContentH) / ratio;
    const srcH = Math.min(pageContentH / ratio, imgH - srcY);

    if (srcH <= 0) break;

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = imgW;
    sliceCanvas.height = Math.ceil(srcH);
    const ctx = sliceCanvas.getContext("2d");
    if (!ctx) continue;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(
      canvas,
      0, Math.floor(srcY), imgW, Math.ceil(srcH),
      0, 0, imgW, Math.ceil(srcH),
    );

    const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);
    const sliceScaledH = srcH * ratio;

    doc.addImage(sliceData, "JPEG", marginX, marginY, usableW, sliceScaledH);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`${page + 2} / ${totalPages}`, pdfW - marginX, pdfH - 5, { align: "right" });
  }

  doc.save("Especificaciones_Plataforma_RLT_CLT.pdf");
}
