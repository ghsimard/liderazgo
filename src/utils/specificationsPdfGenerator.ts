import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Draws a centered title page with IP notice.
 */
function addTitlePage(doc: jsPDF) {
  const pdfW = 210;
  const pdfH = 297;
  const centerX = pdfW / 2;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pdfW, pdfH, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(0, 0, 0);
  doc.text("Especificaciones de la Plataforma", centerX, 95, { align: "center" });
  doc.text("RLT / CLT", centerX, 110, { align: "center" });

  // Divider line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(50, 120, pdfW - 50, 120);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
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

  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("AVISO DE PROPIEDAD INTELECTUAL", centerX, boxY + 14, { align: "center" });

  doc.setDrawColor(0, 0, 0);
  doc.line(boxX + 10, boxY + 19, boxX + boxW - 10, boxY + 19);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(20, 20, 20);

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
  doc.setTextColor(0, 0, 0);
  doc.text("Autor: Ghislain Simard  |  CE 6798900", centerX, pdfH - 30, { align: "center" });
}

/**
 * Identifies mindmap diagram containers in the article element
 * and returns their bounding info relative to the full canvas.
 */
function findMindmapBounds(articleElement: HTMLElement): Array<{ top: number; bottom: number; height: number }> {
  const diagrams: Array<{ top: number; bottom: number; height: number }> = [];
  const articleRect = articleElement.getBoundingClientRect();
  
  // Find all mermaid diagram containers
  const diagramEls = articleElement.querySelectorAll("[data-pdf-target] .my-4.rounded-lg.border");
  diagramEls.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const top = rect.top - articleRect.top;
    const bottom = rect.bottom - articleRect.top;
    diagrams.push({ top, bottom, height: bottom - top });
  });
  
  return diagrams;
}

/**
 * Generates a PDF that is visually identical to the web page
 * by capturing the rendered HTML element with html2canvas.
 * Ensures mindmap diagrams are never split across pages.
 * Optimized for black ink printing with high contrast.
 */
export async function generarPDFSpecifications(
  _markdownContent: string,
  articleElement?: HTMLElement | null,
): Promise<void> {
  if (!articleElement) {
    throw new Error("Article element is required for PDF generation");
  }

  // Before capturing, apply high-contrast styles for print
  const diagramSvgs = articleElement.querySelectorAll("svg");
  const originalStyles: Array<{ el: SVGElement; fill: string; stroke: string }> = [];
  
  diagramSvgs.forEach((svg) => {
    // Increase contrast on all text elements inside SVGs
    const texts = svg.querySelectorAll("text, tspan");
    texts.forEach((t) => {
      const el = t as SVGElement;
      const computedFill = getComputedStyle(el).fill;
      originalStyles.push({ el, fill: el.style.fill, stroke: el.style.stroke });
      // Make light-colored text black for printing, keep white text white
      if (computedFill && computedFill !== "rgb(255, 255, 255)" && computedFill !== "#ffffff") {
        el.style.fill = "#000000";
      }
    });
    
    // Make lines/edges darker
    const paths = svg.querySelectorAll("path, line");
    paths.forEach((p) => {
      const el = p as SVGElement;
      originalStyles.push({ el, fill: el.style.fill, stroke: el.style.stroke });
      if (el.getAttribute("stroke") && el.getAttribute("stroke") !== "none") {
        el.style.stroke = "#000000";
      }
    });
  });

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
      
      // Apply high contrast to cloned SVGs for PDF
      const svgs = el?.querySelectorAll("svg") || [];
      svgs.forEach((svg) => {
        // Make all non-white text black
        svg.querySelectorAll("text, tspan").forEach((t) => {
          const tel = t as SVGElement;
          const fill = tel.getAttribute("fill") || "";
          if (fill && fill !== "#ffffff" && fill !== "white" && fill !== "rgb(255, 255, 255)") {
            tel.setAttribute("fill", "#000000");
          }
        });
        
        // Make edges/lines black
        svg.querySelectorAll("path, line").forEach((p) => {
          const pel = p as SVGElement;
          const stroke = pel.getAttribute("stroke");
          if (stroke && stroke !== "none" && stroke !== "#ffffff") {
            pel.setAttribute("stroke", "#000000");
          }
        });
        
        // Make node backgrounds lighter for printing (except dark/blue nodes which keep their color)
        svg.querySelectorAll("rect, circle, ellipse").forEach((shape) => {
          const sel = shape as SVGElement;
          const fill = sel.getAttribute("fill") || "";
          // Keep blue nodes dark, lighten secondary/tertiary colors
          if (fill === "#e0e7ff" || fill === "#f1f5f9" || fill === "#f8fafc") {
            sel.setAttribute("fill", "#f5f5f5");
            sel.setAttribute("stroke", "#000000");
            sel.setAttribute("stroke-width", "1");
          }
        });
      });
    },
  });

  // Restore original styles
  originalStyles.forEach(({ el, fill, stroke }) => {
    el.style.fill = fill;
    el.style.stroke = stroke;
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

  // Find mindmap diagram positions (scaled to canvas coordinates)
  const articleRect = articleElement.getBoundingClientRect();
  const canvasScale = canvas.width / articleRect.width;
  
  const diagramContainers = articleElement.querySelectorAll(".my-4.rounded-lg.border");
  const diagramBounds: Array<{ canvasTop: number; canvasBottom: number }> = [];
  
  diagramContainers.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const top = (rect.top - articleRect.top) * canvasScale;
    const bottom = (rect.bottom - articleRect.top) * canvasScale;
    diagramBounds.push({ canvasTop: top, canvasBottom: bottom });
  });

  // Build page breaks that avoid splitting diagrams
  const pageBreaks: number[] = []; // canvas Y positions where pages break
  let currentY = 0;
  const pageCanvasH = usableH / ratio; // usable page height in canvas pixels

  while (currentY < imgH) {
    let nextBreak = currentY + pageCanvasH;
    
    if (nextBreak >= imgH) {
      break; // last page
    }

    // Check if any diagram would be split at this break point
    for (const d of diagramBounds) {
      if (d.canvasTop < nextBreak && d.canvasBottom > nextBreak) {
        // This diagram spans the break - move break before the diagram
        // Only if the diagram can fit on a single page
        const diagramH = d.canvasBottom - d.canvasTop;
        if (diagramH <= pageCanvasH) {
          nextBreak = d.canvasTop - 10; // small margin before diagram
          if (nextBreak <= currentY) {
            // Edge case: diagram starts at top of page, just use normal break
            nextBreak = currentY + pageCanvasH;
          }
        }
        break;
      }
    }

    pageBreaks.push(nextBreak);
    currentY = nextBreak;
  }

  const totalPages = pageBreaks.length + 1 + 1; // +1 for last page segment, +1 for title page

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // --- Title page ---
  addTitlePage(doc);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`1 / ${totalPages}`, pdfW - marginX, pdfH - 5, { align: "right" });

  // --- Content pages ---
  const pageStarts = [0, ...pageBreaks];
  
  for (let i = 0; i < pageStarts.length; i++) {
    const srcY = pageStarts[i];
    const srcEnd = i < pageBreaks.length ? pageBreaks[i] : imgH;
    const srcH = srcEnd - srcY;

    if (srcH <= 0) continue;

    doc.addPage();

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
    doc.setTextColor(100, 100, 100);
    doc.text(`${i + 2} / ${totalPages}`, pdfW - marginX, pdfH - 5, { align: "right" });
  }

  doc.save("Especificaciones_Plataforma_RLT_CLT.pdf");
}
