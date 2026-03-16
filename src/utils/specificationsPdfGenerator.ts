import jsPDF from "jspdf";
import {
  loadImageAsBase64,
  getImageNaturalSize,
  logoDims,
  COVER_LOGO_H,
  FOOTER_COSMO_H,
} from "@/utils/pdfLogoHelper";

// ── Colors ────────────────────────────────────────────────────────
const C = {
  title: [17, 24, 39] as const,
  h2: [30, 64, 175] as const,
  h3: [79, 70, 229] as const,
  h4: [124, 58, 237] as const,
  body: [55, 65, 81] as const,
  muted: [107, 114, 128] as const,
  tableHead: [241, 245, 249] as const,
  tableHeadText: [17, 24, 39] as const,
  tableBorder: [226, 232, 240] as const,
  tableStripe: [248, 250, 252] as const,
  codeBg: [241, 245, 249] as const,
  codeText: [55, 65, 81] as const,
  accent: [59, 130, 246] as const,
  blockquoteBg: [239, 246, 255] as const,
  blockquoteBar: [59, 130, 246] as const,
  bullet: [79, 70, 229] as const,
  boldText: [17, 24, 39] as const,
};

interface LogoSources {
  logoRLT: string;
  logoCosmo: string;
}

// ── Inline formatting: draw text segments with bold/code styling ──
function drawRichText(
  doc: jsPDF,
  text: string,
  x: number,
  yy: number,
  maxW: number,
  fontSize: number,
  baseColor: readonly [number, number, number],
): number {
  // Parse inline segments: **bold**, `code`, *italic*, plain
  const segments: { text: string; bold?: boolean; code?: boolean; italic?: boolean }[] = [];
  const regex = /(\*\*(.+?)\*\*)|(`(.+?)`)|(\*(.+?)\*)|([^*`]+)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m[2]) segments.push({ text: m[2], bold: true });
    else if (m[4]) segments.push({ text: m[4], code: true });
    else if (m[6]) segments.push({ text: m[6], italic: true });
    else if (m[7]) segments.push({ text: m[7] });
  }
  if (segments.length === 0) segments.push({ text });

  // Flatten all segments into plain text for line wrapping
  const plainText = segments.map((s) => s.text).join("");
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", "normal");
  const wrappedLines = doc.splitTextToSize(plainText, maxW);

  let linesDrawn = 0;
  let segIdx = 0;
  let charInSeg = 0;

  for (const line of wrappedLines) {
    let cx = x;
    let remaining = line.length;
    let linePos = 0;

    while (remaining > 0 && segIdx < segments.length) {
      const seg = segments[segIdx];
      const availChars = seg.text.length - charInSeg;
      const charsToUse = Math.min(availChars, remaining);
      const chunk = seg.text.substring(charInSeg, charInSeg + charsToUse);

      if (seg.bold) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(C.boldText[0], C.boldText[1], C.boldText[2]);
      } else if (seg.code) {
        doc.setFont("courier", "normal");
        doc.setTextColor(C.codeText[0], C.codeText[1], C.codeText[2]);
      } else if (seg.italic) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(baseColor[0], baseColor[1], baseColor[2]);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(baseColor[0], baseColor[1], baseColor[2]);
      }
      doc.setFontSize(seg.code ? fontSize - 0.5 : fontSize);

      doc.text(chunk, cx, yy);
      cx += doc.getTextWidth(chunk);

      charInSeg += charsToUse;
      remaining -= charsToUse;
      linePos += charsToUse;

      if (charInSeg >= seg.text.length) {
        segIdx++;
        charInSeg = 0;
      }
    }

    yy += fontSize * 0.45;
    linesDrawn++;
  }

  // Reset
  doc.setFont("helvetica", "normal");
  doc.setTextColor(baseColor[0], baseColor[1], baseColor[2]);
  doc.setFontSize(fontSize);

  return linesDrawn;
}

// ── Strip inline formatting (for headers, TOC) ──
const strip = (s: string) =>
  s.replace(/\*\*(.*?)\*\*/g, "$1").replace(/`(.*?)`/g, "$1").replace(/\*(.*?)\*/g, "$1");

// ══════════════════════════════════════════════════════════════════
// ── MAIN EXPORT ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════
export async function generarPDFSpecifications(
  markdownContent: string,
  logoSources: LogoSources,
): Promise<void> {
  const [rltB64, cosmoB64, rltSize, cosmoSize] = await Promise.all([
    loadImageAsBase64(logoSources.logoRLT),
    loadImageAsBase64(logoSources.logoCosmo),
    getImageNaturalSize(logoSources.logoRLT),
    getImageNaturalSize(logoSources.logoCosmo),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;
  const bottomLimit = pageH - 22;
  let y = 0;

  // ── Helpers ──────────────────────────────────────────────────────
  const addFooter = () => {
    const footerY = pageH - 14;
    const cosmoDims = logoDims(cosmoSize.width, cosmoSize.height, FOOTER_COSMO_H);
    try {
      doc.addImage(cosmoB64, "PNG", margin, footerY - 2, cosmoDims.w, cosmoDims.h);
    } catch {}
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
    doc.text(`${doc.getNumberOfPages()}`, pageW - margin, footerY, { align: "right" });
  };

  const newPage = () => {
    addFooter();
    doc.addPage();
    y = 20;
  };

  const checkBreak = (needed: number) => {
    if (y + needed > bottomLimit) newPage();
  };

  const setColor = (c: readonly [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);

  // ── Parse markdown into blocks ──────────────────────────────────
  const rawLines = markdownContent.split("\n");

  type Block =
    | { type: "h1"; text: string }
    | { type: "h2"; text: string }
    | { type: "h3"; text: string }
    | { type: "h4"; text: string }
    | { type: "blockquote"; text: string }
    | { type: "hr" }
    | { type: "table"; headers: string[]; rows: string[][] }
    | { type: "code"; lang: string; lines: string[] }
    | { type: "list"; items: string[] }
    | { type: "paragraph"; text: string }
    | { type: "empty" };

  const blocks: Block[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];

    if (line.trimStart().startsWith("```")) {
      const lang = line.trim().replace(/^```/, "").trim();
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trimStart().startsWith("```")) {
        codeLines.push(rawLines[i]);
        i++;
      }
      i++;
      blocks.push({ type: "code", lang, lines: codeLines });
      continue;
    }

    if (line.includes("|") && i + 1 < rawLines.length && rawLines[i + 1].match(/^\s*\|[\s\-:|]+\|\s*$/)) {
      const headers = line.split("|").filter(Boolean).map((s) => s.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < rawLines.length && rawLines[i].includes("|") && rawLines[i].trim() !== "") {
        rows.push(rawLines[i].split("|").filter(Boolean).map((s) => s.trim()));
        i++;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    if (line.startsWith("# ")) { blocks.push({ type: "h1", text: line.replace(/^# /, "") }); i++; continue; }
    if (line.startsWith("## ")) { blocks.push({ type: "h2", text: line.replace(/^## /, "") }); i++; continue; }
    if (line.startsWith("### ")) { blocks.push({ type: "h3", text: line.replace(/^### /, "") }); i++; continue; }
    if (line.startsWith("#### ")) { blocks.push({ type: "h4", text: line.replace(/^#### /, "") }); i++; continue; }
    if (line.match(/^---+\s*$/)) { blocks.push({ type: "hr" }); i++; continue; }
    if (line.startsWith("> ")) { blocks.push({ type: "blockquote", text: line.replace(/^>\s*/, "") }); i++; continue; }

    if (line.match(/^\s*[-*]\s+/)) {
      const items: string[] = [];
      while (i < rawLines.length && rawLines[i].match(/^\s*[-*]\s+/)) {
        items.push(rawLines[i].replace(/^\s*[-*]\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (line.trim() === "") { blocks.push({ type: "empty" }); i++; continue; }

    const paraLines: string[] = [];
    while (
      i < rawLines.length &&
      rawLines[i].trim() !== "" &&
      !rawLines[i].startsWith("#") &&
      !rawLines[i].startsWith("```") &&
      !rawLines[i].startsWith(">") &&
      !rawLines[i].match(/^---+/) &&
      !rawLines[i].match(/^\s*[-*]\s+/) &&
      !(rawLines[i].includes("|") && i + 1 < rawLines.length && rawLines[i + 1]?.match(/^\s*\|[\s\-:|]+\|\s*$/))
    ) {
      paraLines.push(rawLines[i].trim());
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", text: paraLines.join(" ") });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // ── COVER PAGE ────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════
  const rltTargetH = COVER_LOGO_H + 4;
  const rltW = logoDims(rltSize.width, rltSize.height, rltTargetH).w;

  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pageW, 5, "F");

  y = pageH * 0.25;
  try {
    doc.addImage(rltB64, "PNG", (pageW - rltW) / 2, y, rltW, rltTargetH);
  } catch {}
  y += rltTargetH + 16;

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  setColor(C.title);
  doc.text("ESPECIFICACIONES", pageW / 2, y, { align: "center" });
  y += 12;

  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  setColor(C.h2);
  doc.text("Plataforma RLT / CLT", pageW / 2, y, { align: "center" });
  y += 14;

  doc.setFontSize(10);
  setColor(C.muted);
  doc.text("Documentación oficial de la aplicación", pageW / 2, y, { align: "center" });
  y += 6;
  doc.text("Última actualización: marzo 2026", pageW / 2, y, { align: "center" });
  y += 20;

  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.5);
  doc.line(pageW * 0.3, y, pageW * 0.7, y);

  doc.setFillColor(30, 64, 175);
  doc.rect(0, pageH - 5, pageW, 5, "F");

  addFooter();

  // ══════════════════════════════════════════════════════════════════
  // ── TABLE OF CONTENTS ─────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════
  doc.addPage();
  y = 26;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  setColor(C.h2);
  doc.text("TABLA DE CONTENIDO", margin, y);
  y += 3;
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + 55, y);
  y += 8;

  let tocNum = 0;
  for (const block of blocks) {
    if (block.type === "h2") {
      tocNum++;
      checkBreak(7);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      setColor(C.title);
      doc.text(`${tocNum}.  ${strip(block.text.replace(/^\d+\.\s*/, ""))}`, margin + 2, y);
      y += 6.5;
    } else if (block.type === "h3") {
      checkBreak(5.5);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      setColor(C.body);
      doc.text(`${strip(block.text)}`, margin + 10, y);
      y += 5;
    }
  }

  addFooter();

  // ══════════════════════════════════════════════════════════════════
  // ── CONTENT PAGES ─────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════
  doc.addPage();
  y = 20;

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];

    switch (block.type) {
      case "h1":
        break;

      case "h2": {
        checkBreak(18);
        y += 5;
        // Blue header bar
        doc.setFillColor(...C.h2);
        doc.roundedRect(margin, y - 5, contentW, 9, 1, 1, "F");
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(strip(block.text).toUpperCase(), margin + 4, y + 0.5);
        y += 10;
        break;
      }

      case "h3": {
        checkBreak(14);
        y += 4;
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "bold");
        setColor(C.h3);
        const h3Text = strip(block.text);
        doc.text(h3Text, margin, y);
        y += 1.5;
        doc.setDrawColor(...C.h3);
        doc.setLineWidth(0.25);
        const textW = Math.min(doc.getTextWidth(h3Text), contentW);
        doc.line(margin, y, margin + textW, y);
        y += 5;
        break;
      }

      case "h4": {
        checkBreak(10);
        y += 2;
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "bold");
        setColor(C.h4);
        doc.text(strip(block.text), margin, y);
        y += 5;
        break;
      }

      case "blockquote": {
        checkBreak(12);
        const bqText = strip(block.text);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "italic");
        setColor(C.body);
        const bqLines = doc.splitTextToSize(bqText, contentW - 12);
        const bqH = bqLines.length * 4 + 5;
        doc.setFillColor(...C.blockquoteBg);
        doc.roundedRect(margin, y - 2, contentW, bqH, 1.5, 1.5, "F");
        doc.setFillColor(...C.blockquoteBar);
        doc.rect(margin, y - 2, 1.5, bqH, "F");
        let bqY = y + 2;
        for (const l of bqLines) {
          doc.text(l, margin + 7, bqY);
          bqY += 4;
        }
        y += bqH + 2;
        break;
      }

      case "hr": {
        y += 3;
        doc.setDrawColor(...C.tableBorder);
        doc.setLineWidth(0.15);
        doc.line(margin, y, pageW - margin, y);
        y += 4;
        break;
      }

      case "paragraph": {
        if (strip(block.text).trim() === "") break;
        checkBreak(6);
        const linesCount = drawRichText(doc, block.text, margin, y, contentW, 9, C.body);
        y += linesCount * (9 * 0.45);
        y += 2.5;
        break;
      }

      case "list": {
        for (const item of block.items) {
          checkBreak(6);
          // Bullet
          doc.setFontSize(5);
          doc.setFont("helvetica", "normal");
          setColor(C.bullet);
          doc.text("●", margin + 3, y - 0.3);

          // Rich text for the item
          doc.setFontSize(9);
          const linesCount = drawRichText(doc, item, margin + 8, y, contentW - 10, 9, C.body);
          y += linesCount * (9 * 0.45);
          y += 1.5;
        }
        y += 2;
        break;
      }

      case "table": {
        const { headers, rows } = block;
        const numCols = headers.length;

        // Calculate column widths based on actual text width
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        const colWidths = headers.map((h, ci) => {
          const headerW = doc.getTextWidth(strip(h)) + 6;
          const maxCellW = Math.max(...rows.map((r) => doc.getTextWidth(strip(r[ci] || "")) + 6));
          return Math.max(headerW, maxCellW);
        });

        // Normalize to fit contentW
        const totalW = colWidths.reduce((a, b) => a + b, 0);
        const scale = contentW / totalW;
        const cols = colWidths.map((w) => Math.max(15, w * scale));
        // Re-normalize after min constraint
        const totalAfterMin = cols.reduce((a, b) => a + b, 0);
        const finalScale = contentW / totalAfterMin;
        const finalCols = cols.map((w) => w * finalScale);

        // Calculate row heights based on content wrapping
        const cellPad = 3;
        const cellLineH = 3.5;

        const calcCellHeight = (text: string, colW: number): number => {
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "normal");
          const lines = doc.splitTextToSize(strip(text), colW - cellPad * 2);
          return Math.max(1, lines.length) * cellLineH + 3;
        };

        const headerH = 7;
        const rowHeights = rows.map((row) => {
          let maxH = 6;
          for (let ci = 0; ci < numCols; ci++) {
            maxH = Math.max(maxH, calcCellHeight(row[ci] || "", finalCols[ci]));
          }
          return maxH;
        });

        const totalTableH = headerH + rowHeights.reduce((a, b) => a + b, 0);
        checkBreak(Math.min(totalTableH, 40));

        // Draw header
        let cx = margin;
        doc.setFillColor(...C.tableHead);
        doc.roundedRect(margin, y - 1, contentW, headerH, 0.5, 0.5, "F");
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        setColor(C.tableHeadText);
        for (let ci = 0; ci < numCols; ci++) {
          const cellText = strip(headers[ci]);
          doc.text(cellText, cx + cellPad, y + 3.5, { maxWidth: finalCols[ci] - cellPad * 2 });
          cx += finalCols[ci];
        }
        y += headerH;

        // Draw rows
        for (let ri = 0; ri < rows.length; ri++) {
          const rh = rowHeights[ri];
          checkBreak(rh + 1);
          const row = rows[ri];

          // Stripe
          if (ri % 2 === 0) {
            doc.setFillColor(...C.tableStripe);
            doc.rect(margin, y - 1, contentW, rh, "F");
          }

          // Top border
          doc.setDrawColor(...C.tableBorder);
          doc.setLineWidth(0.1);
          doc.line(margin, y - 1, margin + contentW, y - 1);

          cx = margin;
          doc.setFontSize(7.5);
          setColor(C.body);

          for (let ci = 0; ci < numCols; ci++) {
            const cellText = strip(row[ci] || "");
            const cellW = finalCols[ci] - cellPad * 2;

            // Check for bold prefix like **Texto**: description
            const boldMatch = (row[ci] || "").match(/^\*\*(.*?)\*\*(.*)$/);
            if (boldMatch) {
              doc.setFont("helvetica", "bold");
              setColor(C.boldText);
              const boldPart = boldMatch[1];
              const restPart = strip(boldMatch[2]);
              const fullText = boldPart + restPart;
              const lines = doc.splitTextToSize(fullText, cellW);

              let cy = y + 2.5;
              // Simple approach: bold the first word-length chars
              for (let li = 0; li < lines.length; li++) {
                if (li === 0) {
                  // First line: draw bold part then rest
                  const bw = doc.getTextWidth(boldPart);
                  doc.setFont("helvetica", "bold");
                  setColor(C.boldText);
                  doc.text(boldPart, cx + cellPad, cy);
                  if (restPart) {
                    doc.setFont("helvetica", "normal");
                    setColor(C.body);
                    doc.text(restPart.substring(0, lines[0].length - boldPart.length), cx + cellPad + bw, cy);
                  }
                } else {
                  doc.setFont("helvetica", "normal");
                  setColor(C.body);
                  doc.text(lines[li], cx + cellPad, cy);
                }
                cy += cellLineH;
              }
            } else {
              doc.setFont("helvetica", "normal");
              setColor(C.body);
              const lines = doc.splitTextToSize(cellText, cellW);
              let cy = y + 2.5;
              for (const l of lines) {
                doc.text(l, cx + cellPad, cy);
                cy += cellLineH;
              }
            }

            cx += finalCols[ci];
          }
          y += rh;
        }

        // Bottom border
        doc.setDrawColor(...C.tableBorder);
        doc.setLineWidth(0.1);
        doc.line(margin, y - 1, margin + contentW, y - 1);
        y += 4;
        break;
      }

      case "code": {
        const { lang, lines: codeLines } = block;
        const isMermaid = lang === "mermaid";
        const isStructure = lang === "" && codeLines.some((l) => l.includes("├") || l.includes("│"));

        if (isMermaid) {
          const firstLine = codeLines[0]?.trim() || "";
          const isMindmap = firstLine === "mindmap";
          const isFlowchart = firstLine.startsWith("flowchart");

          const displayLines = codeLines.filter((l) => {
            const t = l.trim();
            return t !== "mindmap" && !t.startsWith("flowchart") && t !== "";
          });

          if (isMindmap) {
            checkBreak(16);
            const lineH = 4.5;

            // Draw a subtle background box
            const estimatedH = displayLines.length * lineH + 8;
            checkBreak(Math.min(estimatedH, 80));
            const boxStartY = y - 2;

            for (const dline of displayLines) {
              checkBreak(lineH + 1);
              const stripped = dline.replace(/^\s+/, "");
              const indent = dline.length - dline.trimStart().length;
              const level = Math.floor(indent / 2);

              const rootMatch = stripped.match(/^root\(\((.*?)\)\)$/);
              if (rootMatch) {
                // Draw root with background pill
                const rootText = rootMatch[1];
                doc.setFontSize(9.5);
                doc.setFont("helvetica", "bold");
                const rw = doc.getTextWidth(rootText) + 10;
                doc.setFillColor(...C.h2);
                doc.roundedRect(margin + 2, y - 4, rw, 7, 2, 2, "F");
                doc.setTextColor(255, 255, 255);
                doc.text(rootText, margin + 7, y);
                y += lineH + 2;
                continue;
              }

              const nodeText = stripped.replace(/^root\(\(/, "").replace(/\)\)$/, "");
              const xOffset = margin + 6 + level * 6;

              if (level <= 1) {
                doc.setFontSize(8.5);
                doc.setFont("helvetica", "bold");
                setColor(C.h3);
                doc.text(`▸ ${nodeText}`, xOffset, y);
              } else if (level === 2) {
                doc.setFontSize(8);
                doc.setFont("helvetica", "normal");
                setColor(C.body);
                doc.text(`▪ ${nodeText}`, xOffset, y);
              } else {
                doc.setFontSize(7.5);
                doc.setFont("helvetica", "normal");
                setColor(C.muted);
                doc.text(`· ${nodeText}`, xOffset, y);
              }
              y += lineH;
            }

            // Draw subtle left border for the whole mindmap
            const boxEndY = y;
            doc.setDrawColor(...C.h3);
            doc.setLineWidth(0.3);
            doc.line(margin + 2, boxStartY, margin + 2, boxEndY);
            y += 3;

          } else if (isFlowchart) {
            checkBreak(16);
            const flowLines = displayLines.filter((l) => l.trim() !== "");

            // Parse flowchart nodes and edges
            for (const fline of flowLines) {
              checkBreak(6);
              const trimmed = fline.trim();

              // Parse node definitions and connections
              const cleaned = trimmed
                .replace(/-->/g, " → ")
                .replace(/-->\|([^|]*)\|/g, " →[$1] ")
                .replace(/\{(.*?)\}/g, "◇ $1")
                .replace(/\[(.*?)\]/g, "$1");

              doc.setFontSize(8);

              if (cleaned.includes("→")) {
                doc.setFont("helvetica", "normal");
                setColor(C.muted);
              } else if (cleaned.includes("◇")) {
                doc.setFont("helvetica", "bold");
                setColor(C.h3);
              } else {
                doc.setFont("helvetica", "normal");
                setColor(C.body);
              }

              const wrappedLines = doc.splitTextToSize(cleaned, contentW - 12);
              for (const wl of wrappedLines) {
                doc.text(wl, margin + 8, y);
                y += 4.2;
              }
            }
            y += 3;
          }
        } else {
          // Regular code block or structure
          const lineH = 3.6;
          const totalH = codeLines.length * lineH + 6;
          checkBreak(Math.min(totalH, 50));

          // Draw background
          const bgStartY = y - 2;

          for (const cl of codeLines) {
            checkBreak(lineH + 1);
            // Draw line bg
            doc.setFillColor(...C.codeBg);
            doc.rect(margin, y - 2.5, contentW, lineH, "F");

            doc.setFontSize(isStructure ? 7.5 : 7);
            doc.setFont("courier", "normal");
            setColor(C.codeText);
            doc.text(cl.substring(0, 120), margin + 3, y);
            y += lineH;
          }
          y += 3;
        }
        break;
      }

      case "empty":
        y += 1.5;
        break;
    }
  }

  addFooter();
  doc.save("Especificaciones_Plataforma_RLT_CLT.pdf");
}
