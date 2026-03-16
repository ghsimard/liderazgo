import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Subtle title page with compact IP notice at the bottom.
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

  // Subtle IP notice at bottom
  const noticeY = pdfH - 38;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(55, noticeY, pdfW - 55, noticeY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text(
    "Propiedad intelectual de Ghislain Simard (CE 6798900). Todos los derechos reservados.",
    centerX,
    noticeY + 6,
    { align: "center" },
  );
  doc.text(
    "Prohibida la reproduccion total o parcial sin consentimiento escrito del autor.",
    centerX,
    noticeY + 11,
    { align: "center" },
  );
}

/**
 * Returns zones (in canvas-pixel coordinates) that must NOT be split across pages:
 * - Diagram / mindmap containers
 * - Heading + the content block immediately following it
 */
function findKeepTogetherZones(
  articleElement: HTMLElement,
  canvasScale: number,
): Array<{ canvasTop: number; canvasBottom: number }> {
  const zones: Array<{ canvasTop: number; canvasBottom: number }> = [];
  const artTop = articleElement.getBoundingClientRect().top;

  // 1. All diagram containers (mermaid, code blocks)
  const diagrams = articleElement.querySelectorAll(".my-4.rounded-lg.border, .my-4.rounded-lg.border-border");
  diagrams.forEach((el) => {
    const r = el.getBoundingClientRect();
    zones.push({
      canvasTop: (r.top - artTop) * canvasScale,
      canvasBottom: (r.bottom - artTop) * canvasScale,
    });
  });

  // 2. Headings grouped with their following content block(s)
  const proseDiv = articleElement.querySelector(".prose");
  if (proseDiv) {
    const headings = proseDiv.querySelectorAll("h2, h3, h4");
    headings.forEach((heading) => {
      const hRect = heading.getBoundingClientRect();
      let bottomRect = hRect;
      let sibling = heading.nextElementSibling;
      let steps = 0;

      // Walk forward through siblings to find the first substantial content block
      while (sibling && steps < 4) {
        const tag = sibling.tagName.toLowerCase();
        const sRect = sibling.getBoundingClientRect();
        bottomRect = sRect;

        // Stop after hitting a content block (table, diagram, code, paragraph)
        if (tag === "table" || tag === "pre" || tag === "div" || tag === "ul" || tag === "ol") {
          break;
        }
        // Also stop at a same-or-higher-level heading (don't group unrelated sections)
        if ((tag === "h2" || tag === "h3" || tag === "h4") && steps > 0) {
          // But include this heading in the zone if it's a sub-heading (e.g., h2 then h3)
          const hLevel = parseInt(heading.tagName[1]);
          const sLevel = parseInt(tag[1]);
          if (sLevel <= hLevel) {
            // Same or higher level heading → don't include, use previous sibling
            bottomRect = (sibling.previousElementSibling || heading).getBoundingClientRect();
            break;
          }
          // Sub-heading → continue to include it + its content
        }
        sibling = sibling.nextElementSibling;
        steps++;
      }

      const groupH = bottomRect.bottom - hRect.top;
      // Only create zone if it's not taller than ~70% of a page (in pixels)
      if (groupH > 0 && groupH < 900) {
        zones.push({
          canvasTop: (hRect.top - artTop) * canvasScale,
          canvasBottom: (bottomRect.bottom - artTop) * canvasScale,
        });
      }
    });
  }

  // Sort by canvasTop for the page-break algorithm
  zones.sort((a, b) => a.canvasTop - b.canvasTop);
  return zones;
}

/**
 * Generates a PDF visually identical to the web page.
 * Ensures diagrams and heading+content blocks are never split across pages.
 * Optimized for black-ink printing with high contrast.
 */
export async function generarPDFSpecifications(
  _markdownContent: string,
  articleElement?: HTMLElement | null,
): Promise<void> {
  if (!articleElement) {
    throw new Error("Article element is required for PDF generation");
  }

  const DARK_FILLS = ["#1e40af", "#1e3a8a", "#1d4ed8", "#2563eb", "#3b82f6"];

  // Capture the rendered article as a high-res canvas
  const canvas = await html2canvas(articleElement, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    onclone: (_clonedDoc) => {
      const el = _clonedDoc.body.querySelector("[data-pdf-target]") as HTMLElement;
      if (!el) return;

      el.style.width = "800px";
      el.style.maxWidth = "800px";
      el.style.padding = "40px";

      // Scale down flowchart diagrams in sections 3.1 and 3.2 (first two diagram containers)
      const containers = el.querySelectorAll(".my-4.rounded-lg.border");
      containers.forEach((container, index) => {
        if (index <= 1) {
          const svgs = container.querySelectorAll("svg");
          svgs.forEach((svg) => {
            (svg as HTMLElement).style.maxWidth = "500px";
            (svg as HTMLElement).style.maxHeight = "320px";
          });
        }
      });

      // High-contrast adjustments for B&W printing
      const svgs = el.querySelectorAll("svg");
      svgs.forEach((svg) => {
        // Text: keep white text white (on dark nodes), make everything else black
        svg.querySelectorAll("text, tspan").forEach((t) => {
          const tel = t as SVGElement;
          const fill = (tel.getAttribute("fill") || "").toLowerCase();
          if (fill === "#ffffff" || fill === "white" || fill === "rgb(255,255,255)" || fill === "rgb(255, 255, 255)") {
            return; // preserve white text on dark backgrounds
          }
          if (fill) {
            tel.setAttribute("fill", "#000000");
          }
        });

        // Force white text on dark-filled nodes
        svg.querySelectorAll("circle, ellipse, rect, path").forEach((shape) => {
          const fill = (shape.getAttribute("fill") || "").toLowerCase();
          if (DARK_FILLS.includes(fill)) {
            const parent = shape.closest("g");
            if (parent) {
              parent.querySelectorAll("text, tspan").forEach((t) => {
                (t as SVGElement).setAttribute("fill", "#ffffff");
              });
            }
          }
        });

        // Make edges/lines black
        svg.querySelectorAll("path, line").forEach((p) => {
          const pel = p as SVGElement;
          const stroke = pel.getAttribute("stroke");
          if (stroke && stroke !== "none" && stroke.toLowerCase() !== "#ffffff") {
            pel.setAttribute("stroke", "#000000");
          }
        });

        // Lighten secondary backgrounds for printing
        svg.querySelectorAll("rect, circle, ellipse").forEach((shape) => {
          const sel = shape as SVGElement;
          const fill = (sel.getAttribute("fill") || "").toLowerCase();
          if (fill === "#e0e7ff" || fill === "#f1f5f9" || fill === "#f8fafc") {
            sel.setAttribute("fill", "#f0f0f0");
            sel.setAttribute("stroke", "#000000");
            sel.setAttribute("stroke-width", "1");
          }
        });
      });
    },
  });

  // PDF dimensions (A4)
  const pdfW = 210;
  const pdfH = 297;
  const marginX = 10;
  const marginY = 10;
  const usableW = pdfW - marginX * 2;
  const usableH = pdfH - marginY * 2;

  const imgW = canvas.width;
  const imgH = canvas.height;
  const ratio = usableW / imgW;

  // Compute keep-together zones from original DOM positions
  const articleRect = articleElement.getBoundingClientRect();
  const canvasScale = canvas.width / articleRect.width;
  const keepZones = findKeepTogetherZones(articleElement, canvasScale);

  // Build page breaks that respect keep-together zones
  const pageBreaks: number[] = [];
  let currentY = 0;
  const pageCanvasH = usableH / ratio;

  while (currentY < imgH) {
    let nextBreak = currentY + pageCanvasH;
    if (nextBreak >= imgH) break;

    // Check every zone for conflicts
    for (const z of keepZones) {
      if (z.canvasTop < nextBreak && z.canvasBottom > nextBreak) {
        // This zone would be split — move break before it
        const zoneH = z.canvasBottom - z.canvasTop;
        if (zoneH <= pageCanvasH) {
          const adjusted = z.canvasTop - 10;
          if (adjusted > currentY + pageCanvasH * 0.15) {
            // Only adjust if it doesn't make the page absurdly short
            nextBreak = adjusted;
          }
        }
        break; // handle first conflicting zone only
      }
    }

    pageBreaks.push(nextBreak);
    currentY = nextBreak;
  }

  const totalPages = pageBreaks.length + 1 + 1; // +1 last segment, +1 title
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
    ctx.drawImage(canvas, 0, Math.floor(srcY), imgW, Math.ceil(srcH), 0, 0, imgW, Math.ceil(srcH));

    const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);
    const sliceScaledH = srcH * ratio;
    doc.addImage(sliceData, "JPEG", marginX, marginY, usableW, sliceScaledH);

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`${i + 2} / ${totalPages}`, pdfW - marginX, pdfH - 5, { align: "right" });
  }

  doc.save("Especificaciones_Plataforma_RLT_CLT.pdf");
}
