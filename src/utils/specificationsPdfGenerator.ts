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
  title: [17, 24, 39] as const,       // near-black
  h2: [30, 64, 175] as const,         // blue
  h3: [79, 70, 229] as const,         // indigo
  h4: [124, 58, 237] as const,        // purple
  body: [55, 65, 81] as const,        // gray-700
  muted: [107, 114, 128] as const,    // gray-500
  tableHead: [243, 244, 246] as const, // gray-100
  tableHeadText: [17, 24, 39] as const,
  tableBorder: [209, 213, 219] as const,
  codeBg: [243, 244, 246] as const,
  codeText: [55, 65, 81] as const,
  accent: [59, 130, 246] as const,    // blue-500
  blockquoteBg: [239, 246, 255] as const,
  blockquoteBar: [59, 130, 246] as const,
  bullet: [79, 70, 229] as const,
};

interface LogoSources {
  logoRLT: string;
  logoCosmo: string;
}

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
  const bottomLimit = pageH - 24;
  let y = 0;
  let pageCount = 0;

  // ── Helpers ──────────────────────────────────────────────────────
  const addFooter = (pageNum?: number) => {
    const footerY = pageH - 16;
    const cosmoDims = logoDims(cosmoSize.width, cosmoSize.height, FOOTER_COSMO_H);
    try { doc.addImage(cosmoB64, "PNG", margin, footerY - 2, cosmoDims.w, cosmoDims.h); } catch {}
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.muted);
    doc.text(`${pageNum ?? doc.getNumberOfPages()}`, pageW - margin, footerY, { align: "right" });
  };

  const newPage = () => {
    addFooter();
    doc.addPage();
    pageCount++;
    y = 22;
  };

  const checkBreak = (needed: number) => {
    if (y + needed > bottomLimit) newPage();
  };

  const setColor = (c: readonly [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);

  const drawText = (text: string, x: number, yy: number, opts?: { maxWidth?: number; align?: string }) => {
    doc.text(text, x, yy, opts as any);
  };

  const wrapAndDraw = (text: string, fontSize: number, font: string, style: string, color: readonly [number, number, number], indent = 0, maxW?: number): number => {
    doc.setFontSize(fontSize);
    doc.setFont(font, style);
    setColor(color);
    const w = maxW ?? (contentW - indent);
    const lines = doc.splitTextToSize(text, w);
    const lineH = fontSize * 0.45;
    for (const line of lines) {
      checkBreak(lineH + 1);
      drawText(line, margin + indent, y);
      y += lineH;
    }
    return lines.length;
  };

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

    // Code block
    if (line.trimStart().startsWith("```")) {
      const lang = line.trim().replace(/^```/, "").trim();
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trimStart().startsWith("```")) {
        codeLines.push(rawLines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: "code", lang, lines: codeLines });
      continue;
    }

    // Table
    if (line.includes("|") && i + 1 < rawLines.length && rawLines[i + 1].match(/^\s*\|[\s\-:|]+\|\s*$/)) {
      const headers = line.split("|").filter(Boolean).map((s) => s.trim());
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < rawLines.length && rawLines[i].includes("|") && rawLines[i].trim() !== "") {
        rows.push(rawLines[i].split("|").filter(Boolean).map((s) => s.trim()));
        i++;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    // Headers
    if (line.startsWith("# ")) { blocks.push({ type: "h1", text: line.replace(/^# /, "") }); i++; continue; }
    if (line.startsWith("## ")) { blocks.push({ type: "h2", text: line.replace(/^## /, "") }); i++; continue; }
    if (line.startsWith("### ")) { blocks.push({ type: "h3", text: line.replace(/^### /, "") }); i++; continue; }
    if (line.startsWith("#### ")) { blocks.push({ type: "h4", text: line.replace(/^#### /, "") }); i++; continue; }

    // HR
    if (line.match(/^---+\s*$/)) { blocks.push({ type: "hr" }); i++; continue; }

    // Blockquote
    if (line.startsWith("> ")) { blocks.push({ type: "blockquote", text: line.replace(/^>\s*/, "") }); i++; continue; }

    // List items (collect consecutive)
    if (line.match(/^\s*[-*]\s+/)) {
      const items: string[] = [];
      while (i < rawLines.length && rawLines[i].match(/^\s*[-*]\s+/)) {
        items.push(rawLines[i].replace(/^\s*[-*]\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    // Empty line
    if (line.trim() === "") { blocks.push({ type: "empty" }); i++; continue; }

    // Paragraph — collect consecutive non-empty non-special lines
    const paraLines: string[] = [];
    while (i < rawLines.length && rawLines[i].trim() !== "" && !rawLines[i].startsWith("#") && !rawLines[i].startsWith("```") && !rawLines[i].startsWith(">") && !rawLines[i].match(/^---+/) && !rawLines[i].match(/^\s*[-*]\s+/) && !(rawLines[i].includes("|") && i + 1 < rawLines.length && rawLines[i + 1]?.match(/^\s*\|[\s\-:|]+\|\s*$/))) {
      paraLines.push(rawLines[i].trim());
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", text: paraLines.join(" ") });
    }
  }

  // ── Strip inline markdown formatting ────────────────────────────
  const strip = (s: string) => s.replace(/\*\*(.*?)\*\*/g, "$1").replace(/`(.*?)`/g, "$1").replace(/\*(.*?)\*/g, "$1");

  // ══════════════════════════════════════════════════════════════════
  // ── COVER PAGE ────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════
  const rltTargetH = COVER_LOGO_H + 4;
  const rltW = logoDims(rltSize.width, rltSize.height, rltTargetH).w;

  // Decorative top bar
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pageW, 6, "F");

  y = pageH * 0.25;
  try { doc.addImage(rltB64, "PNG", (pageW - rltW) / 2, y, rltW, rltTargetH); } catch {}
  y += rltTargetH + 16;

  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  setColor(C.title);
  doc.text("ESPECIFICACIONES", pageW / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  setColor(C.h2);
  doc.text("Plataforma RLT / CLT", pageW / 2, y, { align: "center" });
  y += 14;

  doc.setFontSize(10);
  setColor(C.muted);
  doc.text("Documentación oficial de la aplicación", pageW / 2, y, { align: "center" });
  y += 6;
  doc.text(`Última actualización: marzo 2026`, pageW / 2, y, { align: "center" });
  y += 20;

  // Decorative line
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.5);
  doc.line(pageW * 0.3, y, pageW * 0.7, y);

  // Bottom decorative bar
  doc.setFillColor(30, 64, 175);
  doc.rect(0, pageH - 6, pageW, 6, "F");

  addFooter();
  pageCount = 1;

  // ══════════════════════════════════════════════════════════════════
  // ── TABLE OF CONTENTS ─────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════
  doc.addPage();
  pageCount++;
  y = 28;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  setColor(C.h2);
  doc.text("TABLA DE CONTENIDO", margin, y);
  y += 12;

  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.3);
  doc.line(margin, y - 3, margin + 60, y - 3);
  y += 4;

  let tocNum = 0;
  for (const block of blocks) {
    if (block.type === "h2") {
      tocNum++;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      setColor(C.title);
      doc.text(`${tocNum}.  ${strip(block.text.replace(/^\d+\.\s*/, ""))}`, margin + 2, y);
      y += 6;
    } else if (block.type === "h3") {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      setColor(C.body);
      doc.text(`      ${strip(block.text)}`, margin + 6, y);
      y += 5;
    }
    if (y > bottomLimit - 10) {
      newPage();
    }
  }

  addFooter();

  // ══════════════════════════════════════════════════════════════════
  // ── CONTENT PAGES ─────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════
  doc.addPage();
  pageCount++;
  y = 22;

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];

    switch (block.type) {
      case "h1":
        // Skip – already on cover
        break;

      case "h2": {
        checkBreak(20);
        y += 6;
        doc.setFillColor(...C.h2);
        doc.rect(margin, y - 4.5, contentW, 8, "F");
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(strip(block.text).toUpperCase(), margin + 3, y + 1);
        y += 10;
        break;
      }

      case "h3": {
        checkBreak(14);
        y += 4;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        setColor(C.h3);
        const h3Text = strip(block.text);
        doc.text(h3Text, margin, y);
        y += 1.5;
        doc.setDrawColor(...C.h3);
        doc.setLineWidth(0.3);
        doc.line(margin, y, margin + Math.min(doc.getTextWidth(h3Text), contentW), y);
        y += 5;
        break;
      }

      case "h4": {
        checkBreak(10);
        y += 2;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        setColor(C.h4);
        doc.text(strip(block.text), margin, y);
        y += 5;
        break;
      }

      case "blockquote": {
        checkBreak(14);
        const bqText = strip(block.text);
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        setColor(C.body);
        const bqLines = doc.splitTextToSize(bqText, contentW - 10);
        const bqH = bqLines.length * 4.2 + 4;
        doc.setFillColor(...C.blockquoteBg);
        doc.roundedRect(margin, y - 2, contentW, bqH, 1.5, 1.5, "F");
        doc.setFillColor(...C.blockquoteBar);
        doc.rect(margin, y - 2, 1.5, bqH, "F");
        for (const l of bqLines) {
          doc.text(l, margin + 6, y + 2);
          y += 4.2;
        }
        y += 4;
        break;
      }

      case "hr": {
        y += 2;
        doc.setDrawColor(...C.tableBorder);
        doc.setLineWidth(0.2);
        doc.line(margin, y, pageW - margin, y);
        y += 4;
        break;
      }

      case "paragraph": {
        const pText = strip(block.text);
        if (pText.trim() === "") break;
        wrapAndDraw(pText, 9, "helvetica", "normal", C.body);
        y += 3;
        break;
      }

      case "list": {
        for (const item of block.items) {
          checkBreak(6);
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          setColor(C.bullet);
          doc.text("●", margin + 2, y);
          
          // Handle bold prefix in list items
          const stripped = strip(item);
          setColor(C.body);
          const listLines = doc.splitTextToSize(stripped, contentW - 10);
          for (let li = 0; li < listLines.length; li++) {
            if (li > 0) checkBreak(4);
            doc.text(listLines[li], margin + 7, y);
            y += 4;
          }
          y += 1;
        }
        y += 2;
        break;
      }

      case "table": {
        const { headers, rows } = block;
        const numCols = headers.length;
        
        // Calculate column widths proportionally
        const totalContentLen = headers.reduce((sum, h, ci) => {
          const maxLen = Math.max(h.length, ...rows.map((r) => (r[ci] || "").length));
          return sum + maxLen;
        }, 0);
        
        const colWidths = headers.map((h, ci) => {
          const maxLen = Math.max(h.length, ...rows.map((r) => (r[ci] || "").length));
          return Math.max(20, (maxLen / totalContentLen) * contentW);
        });

        // Normalize to fit contentW
        const totalW = colWidths.reduce((a, b) => a + b, 0);
        const scale = contentW / totalW;
        const cols = colWidths.map((w) => w * scale);

        const rowH = 7;
        const headerH = 8;
        const totalTableH = headerH + rows.length * rowH;
        checkBreak(Math.min(totalTableH, 50));

        // Header row
        let cx = margin;
        doc.setFillColor(...C.tableHead);
        doc.rect(margin, y - 3, contentW, headerH, "F");
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        setColor(C.tableHeadText);
        for (let ci = 0; ci < numCols; ci++) {
          const cellText = strip(headers[ci]);
          const truncated = doc.splitTextToSize(cellText, cols[ci] - 3)[0];
          doc.text(truncated, cx + 2, y + 1);
          cx += cols[ci];
        }
        y += headerH;

        // Data rows
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        for (let ri = 0; ri < rows.length; ri++) {
          checkBreak(rowH + 2);
          const row = rows[ri];
          cx = margin;

          if (ri % 2 === 1) {
            doc.setFillColor(249, 250, 251);
            doc.rect(margin, y - 3.5, contentW, rowH, "F");
          }

          // Draw borders
          doc.setDrawColor(...C.tableBorder);
          doc.setLineWidth(0.15);
          doc.line(margin, y - 3.5, margin + contentW, y - 3.5);

          setColor(C.body);
          for (let ci = 0; ci < numCols; ci++) {
            const cellText = strip(row[ci] || "");
            const wrappedLines = doc.splitTextToSize(cellText, cols[ci] - 4);
            doc.text(wrappedLines[0] || "", cx + 2, y);
            if (wrappedLines.length > 1) {
              doc.setFontSize(6.5);
              doc.text(wrappedLines[1], cx + 2, y + 3.2);
              doc.setFontSize(7.5);
            }
            cx += cols[ci];
          }
          y += rowH;
        }

        // Bottom border
        doc.setDrawColor(...C.tableBorder);
        doc.line(margin, y - 3.5, margin + contentW, y - 3.5);
        y += 4;
        break;
      }

      case "code": {
        const { lang, lines: codeLines } = block;
        
        // For mermaid diagrams, render as styled diagram blocks
        const isMermaid = lang === "mermaid";
        const isStructure = lang === "" && codeLines.some((l) => l.includes("├") || l.includes("│"));

        if (isMermaid) {
          // Determine diagram type
          const firstLine = codeLines[0]?.trim() || "";
          const isMindmap = firstLine === "mindmap";
          const isFlowchart = firstLine.startsWith("flowchart");

          // Filter and clean lines
          const displayLines = codeLines.filter((l) => {
            const t = l.trim();
            return t !== "mindmap" && !t.startsWith("flowchart") && t !== "";
          });

          if (isMindmap) {
            // Render mindmap as a styled hierarchical block
            checkBreak(20);
            const boxPadding = 3;
            const lineH = 4.5;
            const totalH = displayLines.length * lineH + boxPadding * 2 + 2;
            checkBreak(Math.min(totalH, 80));

            // Background
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(...C.h3);
            doc.setLineWidth(0.3);
            const boxY = y - 2;

            for (const dline of displayLines) {
              checkBreak(lineH + 1);
              const stripped = dline.replace(/^\s+/, "");
              const indent = dline.length - dline.trimStart().length;
              const level = Math.floor(indent / 2);

              // Root node (inside double parens)
              const rootMatch = stripped.match(/^root\(\((.*?)\)\)$/);
              if (rootMatch) {
                doc.setFontSize(9);
                doc.setFont("helvetica", "bold");
                setColor(C.h2);
                doc.text(`◉ ${rootMatch[1]}`, margin + 4, y);
                y += lineH + 1;
                continue;
              }

              const nodeText = stripped.replace(/^root\(\(/, "").replace(/\)\)$/, "");
              const xOffset = margin + 4 + level * 5;

              if (level <= 1) {
                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                setColor(C.h3);
                doc.text(`▸ ${nodeText}`, xOffset, y);
              } else {
                doc.setFontSize(7.5);
                doc.setFont("helvetica", "normal");
                setColor(C.body);
                const bullet = level <= 2 ? "▪" : "·";
                doc.text(`${bullet} ${nodeText}`, xOffset, y);
              }
              y += lineH;
            }
            y += 4;
          } else if (isFlowchart) {
            // Render flowchart as simplified step diagram
            checkBreak(20);
            const flowLines = displayLines.filter((l) => l.trim() !== "");

            doc.setFillColor(248, 250, 252);
            const fBoxH = flowLines.length * 5 + 8;
            checkBreak(Math.min(fBoxH, 60));

            for (const fline of flowLines) {
              checkBreak(6);
              const cleaned = fline.trim()
                .replace(/-->/g, " → ")
                .replace(/\|/g, "")
                .replace(/\{(.*?)\}/g, "◇ $1")
                .replace(/\[(.*?)\]/g, "▢ $1");

              doc.setFontSize(8);
              doc.setFont("helvetica", "normal");
              setColor(C.body);

              // Style based on content
              if (cleaned.includes("→")) {
                doc.setFont("helvetica", "normal");
                setColor(C.muted);
              } else if (cleaned.includes("◇")) {
                doc.setFont("helvetica", "bold");
                setColor(C.h3);
              } else if (cleaned.includes("▢")) {
                setColor(C.body);
              }

              const fLines = doc.splitTextToSize(cleaned, contentW - 10);
              for (const fl of fLines) {
                doc.text(fl, margin + 6, y);
                y += 4.5;
              }
            }
            y += 3;
          }
        } else {
          // Regular code block or structure
          const lineH = 3.8;
          const boxH = codeLines.length * lineH + 6;
          checkBreak(Math.min(boxH, 60));

          doc.setFillColor(...C.codeBg);
          doc.setDrawColor(...C.tableBorder);
          doc.setLineWidth(0.2);

          if (isStructure) {
            // Sidebar structure rendering
            for (const cl of codeLines) {
              checkBreak(lineH + 1);
              doc.setFontSize(7.5);
              doc.setFont("courier", "normal");
              setColor(C.codeText);
              doc.text(cl, margin + 3, y);
              y += lineH;
            }
          } else {
            for (const cl of codeLines) {
              checkBreak(lineH + 1);
              doc.setFontSize(7);
              doc.setFont("courier", "normal");
              setColor(C.codeText);
              const truncated = cl.substring(0, 120);
              doc.text(truncated, margin + 3, y);
              y += lineH;
            }
          }
          y += 4;
        }
        break;
      }

      case "empty":
        y += 1.5;
        break;
    }
  }

  // Final footer
  addFooter();

  doc.save("Especificaciones_Plataforma_RLT_CLT.pdf");
}
