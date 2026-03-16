import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Generates a PDF that is visually identical to the web page
 * by capturing the rendered HTML element with html2canvas.
 */
export async function generarPDFSpecifications(
  _markdownContent: string,
  _logoSources: { logoRLT: string; logoCosmo: string },
  articleElement?: HTMLElement | null,
): Promise<void> {
  if (!articleElement) {
    throw new Error("Article element is required for PDF generation");
  }

  // Capture the rendered article as a high-res canvas
  const canvas = await html2canvas(articleElement, {
    scale: 2, // 2x for crisp text
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    // Wait for mermaid SVGs to render
    onclone: (clonedDoc) => {
      const el = clonedDoc.body.querySelector("[data-pdf-target]") as HTMLElement;
      if (el) {
        el.style.width = "800px";
        el.style.maxWidth = "800px";
        el.style.padding = "40px";
      }
    },
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);

  // PDF dimensions (A4)
  const pdfW = 210; // mm
  const pdfH = 297; // mm
  const marginX = 10;
  const marginY = 10;
  const usableW = pdfW - marginX * 2;
  const usableH = pdfH - marginY * 2;

  // Scale canvas to fit PDF width
  const imgW = canvas.width;
  const imgH = canvas.height;
  const ratio = usableW / imgW;
  const scaledH = imgH * ratio;

  // Calculate how many pages we need
  const pageContentH = usableH;
  const totalPages = Math.ceil(scaledH / pageContentH);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();

    // Source coordinates on the canvas for this page slice
    const srcY = (page * pageContentH) / ratio;
    const srcH = Math.min(pageContentH / ratio, imgH - srcY);

    if (srcH <= 0) break;

    // Create a slice canvas for this page
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

    // Page number
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`${page + 1} / ${totalPages}`, pdfW - marginX, pdfH - 5, { align: "right" });
  }

  doc.save("Especificaciones_Plataforma_RLT_CLT.pdf");
}
