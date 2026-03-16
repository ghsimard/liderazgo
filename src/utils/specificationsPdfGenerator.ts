import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Finds optimal page-break Y positions on the canvas so that
 * no block-level element (heading, paragraph, diagram, table, etc.)
 * is split across two pages.
 */
function findSmartBreaks(
  articleEl: HTMLElement,
  canvasHeight: number,
  scale: number,
  pageContentH_css: number, // usable page height in CSS px
): number[] {
  // Collect Y boundaries of every direct block child (recursively through prose wrapper)
  const articleRect = articleEl.getBoundingClientRect();
  const topOffset = articleRect.top;

  // Gather all block-level elements we don't want to split
  const selectors = "h1,h2,h3,h4,h5,h6,p,li,ul,ol,pre,blockquote,table,tr,svg,.mermaid-container,div[class*='mermaid']";
  const blocks = articleEl.querySelectorAll(selectors);

  interface Block {
    topPx: number; // position on canvas in real pixels (scaled)
    bottomPx: number;
  }

  const blockPositions: Block[] = [];
  blocks.forEach((el) => {
    const r = el.getBoundingClientRect();
    const top = (r.top - topOffset) * scale;
    const bottom = (r.bottom - topOffset) * scale;
    if (bottom > 0 && top < canvasHeight) {
      blockPositions.push({ topPx: top, bottomPx: bottom });
    }
  });

  // Sort by top position
  blockPositions.sort((a, b) => a.topPx - b.topPx);

  const pageH = pageContentH_css * scale; // page height on canvas in real pixels
  const breaks: number[] = [];
  let currentPageStart = 0;

  while (currentPageStart + pageH < canvasHeight) {
    let idealBreak = currentPageStart + pageH;

    // Find the last block that starts before idealBreak and ends after it (i.e. it's being split)
    // We want to move the break UP to just before that block starts
    let bestBreak = idealBreak;

    // Search for blocks that straddle the ideal break point
    for (const block of blockPositions) {
      if (block.topPx >= idealBreak) break; // past our break point
      if (block.bottomPx <= currentPageStart) continue; // before current page

      // This block straddles the break point
      if (block.topPx < idealBreak && block.bottomPx > idealBreak) {
        // Move break up to just before this block
        // But only if the block fits on a single page
        if (block.bottomPx - block.topPx <= pageH * 0.9) {
          bestBreak = Math.max(currentPageStart + pageH * 0.3, block.topPx - 4 * scale);
        }
        // If block is too tall for one page, let it split at the ideal point
        break;
      }
    }

    // Also check: don't leave a heading orphaned at the bottom of a page
    // (heading with no content after it on the same page)
    for (const block of blockPositions) {
      if (block.topPx >= bestBreak) break;
      if (block.bottomPx <= currentPageStart) continue;
      // If a heading is in the last 15% of the page, pull the break before it
      if (block.bottomPx > bestBreak - pageH * 0.15 && block.bottomPx <= bestBreak) {
        // Check if this is likely a heading (small height, near break)
        const blockHeight = block.bottomPx - block.topPx;
        if (blockHeight < 60 * scale) {
          bestBreak = Math.max(currentPageStart + pageH * 0.3, block.topPx - 4 * scale);
        }
      }
    }

    breaks.push(bestBreak);
    currentPageStart = bestBreak;
  }

  return breaks;
}

/**
 * Generates a PDF that is visually identical to the web page
 * by capturing the rendered HTML element with html2canvas.
 * Uses smart page breaks to avoid splitting text blocks and diagrams.
 */
export async function generarPDFSpecifications(
  _markdownContent: string,
  _logoSources: { logoRLT: string; logoCosmo: string },
  articleElement?: HTMLElement | null,
): Promise<void> {
  if (!articleElement) {
    throw new Error("Article element is required for PDF generation");
  }

  const SCALE = 2;

  // Capture the rendered article as a high-res canvas
  const canvas = await html2canvas(articleElement, {
    scale: SCALE,
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
  const pdfW = 210; // mm
  const pdfH = 297; // mm
  const marginX = 10;
  const marginY = 10;
  const footerH = 8; // reserved for footer
  const usableW = pdfW - marginX * 2;
  const usableH = pdfH - marginY * 2 - footerH;

  const imgW = canvas.width;
  const imgH = canvas.height;
  const ratio = usableW / imgW; // mm per canvas pixel

  // Convert usable page height to CSS pixels then to canvas pixels
  const pageContentH_css = usableH / ratio; // canvas-pixel height per page

  // Find smart break points
  const breaks = findSmartBreaks(articleElement, imgH, SCALE, pageContentH_css / SCALE);

  // Build page slices
  const slices: { srcY: number; srcH: number }[] = [];
  let prevBreak = 0;
  for (const brk of breaks) {
    slices.push({ srcY: prevBreak, srcH: brk - prevBreak });
    prevBreak = brk;
  }
  // Last page
  if (prevBreak < imgH) {
    slices.push({ srcY: prevBreak, srcH: imgH - prevBreak });
  }

  const totalPages = slices.length;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();

    const { srcY, srcH } = slices[page];
    if (srcH <= 0) continue;

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

  // Add intellectual property page at the end
  doc.addPage();
  const ipPageNum = totalPages + 1;

  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text("Propiedad Intelectual", pdfW / 2, 40, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  const ipLines = [
    "Este documento y su contenido son propiedad intelectual de:",
    "",
    "Ghislain Simard",
    "CE 6798900",
    "",
    "Todos los derechos reservados. Queda prohibida la reproducción,",
    "distribución, comunicación pública o transformación total o parcial",
    "de este documento sin la autorización expresa y por escrito del autor.",
    "",
    `Fecha de generación: ${new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}`,
  ];

  let y = 55;
  for (const line of ipLines) {
    doc.text(line, pdfW / 2, y, { align: "center" });
    y += 6;
  }

  // Footer on IP page
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`${ipPageNum} / ${ipPageNum}`, pdfW - marginX, pdfH - 5, { align: "right" });

  doc.save("Especificaciones_Plataforma_RLT_CLT.pdf");
}
