import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { PdfBlock, TextSpan } from './specPdfTypes';

// ── Layout constants (A4 mm) ──────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 15;
const MARGIN_TOP = 15;
const MARGIN_BOTTOM = 15;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const USABLE_H = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM;
const PT = 0.352778; // 1pt in mm

// ── Colors ─────────────────────────────────────────────────────────
type RGB = [number, number, number];
const C_BLACK: RGB = [0, 0, 0];
const C_DARK: RGB = [30, 30, 30];
const C_BODY: RGB = [74, 85, 104];
const C_BORDER: RGB = [220, 220, 220];
const C_MUTED_BG: RGB = [245, 245, 245];
const C_PRIMARY: RGB = [30, 64, 175];
const C_PRIMARY_LIGHT: RGB = [239, 246, 255];
const C_FOOTER: RGB = [130, 130, 130];
const C_TABLE_HEAD_BG: RGB = [240, 240, 240];
const C_TABLE_ALT: RGB = [250, 250, 250];

// ── Font sizes ─────────────────────────────────────────────────────
const FS: Record<string, number> = { h1: 20, h2: 16, h3: 14, h4: 12, body: 9.5, code: 8, small: 7 };

function lineH(fontSize: number, factor = 1.5): number {
  return fontSize * PT * factor;
}

// ── Text measurement ───────────────────────────────────────────────
function measureFormattedText(doc: jsPDF, spans: TextSpan[], maxW: number, fontSize: number): number {
  const lh = lineH(fontSize);
  let curX = 0;
  let lines = 1;

  for (const span of spans) {
    if (!span.text) continue;
    doc.setFont(span.code ? 'courier' : 'helvetica', span.bold ? 'bold' : span.italic ? 'italic' : 'normal');
    doc.setFontSize(fontSize);

    const parts = span.text.split('\n');
    for (let pi = 0; pi < parts.length; pi++) {
      if (pi > 0) { curX = 0; lines++; }
      const tokens = parts[pi].split(/(\s+)/);
      for (const token of tokens) {
        if (!token) continue;
        const w = doc.getTextWidth(token);
        if (curX + w > maxW && !/^\s+$/.test(token) && curX > 0.5) { curX = 0; lines++; }
        curX += w;
      }
    }
  }
  return lines * lh;
}

// ── Text rendering with mixed formatting ───────────────────────────
function renderFormattedText(
  doc: jsPDF, spans: TextSpan[], x: number, y: number,
  maxW: number, fontSize: number, color: RGB,
): number {
  const lh = lineH(fontSize);
  let curX = x;
  let curY = y;

  for (const span of spans) {
    if (!span.text) continue;
    const font = span.code ? 'courier' : 'helvetica';
    const style = span.bold && span.italic ? 'bolditalic' : span.bold ? 'bold' : span.italic ? 'italic' : 'normal';

    const parts = span.text.split('\n');
    for (let pi = 0; pi < parts.length; pi++) {
      if (pi > 0) { curX = x; curY += lh; }
      const tokens = parts[pi].split(/(\s+)/);
      for (const token of tokens) {
        if (!token) continue;
        doc.setFont(font, style);
        doc.setFontSize(fontSize);
        const tw = doc.getTextWidth(token);

        if (curX + tw > x + maxW && !/^\s+$/.test(token) && curX > x + 0.5) {
          curX = x;
          curY += lh;
        }

        // Inline code background
        if (span.code && token.trim()) {
          doc.setFillColor(...C_MUTED_BG);
          const bgH = fontSize * PT;
          doc.roundedRect(curX - 0.3, curY - bgH * 0.75, tw + 0.6, bgH * 1.1, 0.3, 0.3, 'F');
          doc.setTextColor(...C_DARK);
        } else {
          doc.setTextColor(...color);
        }

        doc.text(token, curX, curY);
        curX += tw;
      }
    }
  }
  return curY - y + lh;
}

// ── Block measurement ──────────────────────────────────────────────
function measureBlock(doc: jsPDF, block: PdfBlock): number {
  switch (block.type) {
    case 'heading': {
      const fs = FS[`h${block.level || 1}`] || FS.h4;
      const topSpace = (block.level || 1) <= 2 ? 8 : 5;
      const bottomSpace = (block.level || 1) <= 2 ? 6 : 3;
      return topSpace + measureFormattedText(doc, block.spans || [], CONTENT_W, fs) + bottomSpace;
    }
    case 'paragraph':
      return measureFormattedText(doc, block.spans || [], CONTENT_W, FS.body) + 4;
    case 'list': {
      let h = 2;
      for (const item of block.items || []) {
        h += measureFormattedText(doc, item.spans, CONTENT_W - 10 - item.indent * 6, FS.body) + 1.5;
      }
      return h + 2;
    }
    case 'table': {
      const rows = block.tableRows || [];
      return 8 + rows.length * 7;
    }
    case 'diagram': {
      if (!block.imageWidth || !block.imageHeight) return 60;
      const ratio = block.imageHeight / block.imageWidth;
      const imgW = Math.min(CONTENT_W, 170);
      return Math.min(imgW * ratio, USABLE_H - 10) + 8;
    }
    case 'blockquote':
      return measureFormattedText(doc, block.spans || [], CONTENT_W - 15, FS.body) + 10;
    case 'code': {
      const lines = (block.codeText || '').split('\n').length;
      return lines * 3.5 + 8;
    }
    case 'hr':
      return 10;
    default:
      return 0;
  }
}

// ── Individual block renderers ─────────────────────────────────────
function renderHeading(doc: jsPDF, block: PdfBlock, y: number): number {
  const level = block.level || 1;
  const fs = FS[`h${level}`] || FS.h4;
  const topSpace = level <= 2 ? 8 : 5;
  y += topSpace;

  const textH = renderFormattedText(doc, block.spans || [], MARGIN_X, y, CONTENT_W, fs, C_BLACK);
  y += textH;

  if (level <= 2) {
    doc.setDrawColor(...C_BORDER);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, y + 1, MARGIN_X + CONTENT_W, y + 1);
    y += 4;
  } else {
    y += 2;
  }
  return y;
}

function renderParagraph(doc: jsPDF, block: PdfBlock, y: number): number {
  const textH = renderFormattedText(doc, block.spans || [], MARGIN_X, y, CONTENT_W, FS.body, C_BODY);
  return y + textH + 3;
}

function renderList(doc: jsPDF, block: PdfBlock, y: number): number {
  const items = block.items || [];
  let itemY = y + 2;
  let counter = 1;

  for (const item of items) {
    const indent = MARGIN_X + 4 + item.indent * 6;
    const textW = CONTENT_W - 4 - item.indent * 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FS.body);
    doc.setTextColor(...C_BODY);

    if (block.ordered && item.indent === 0) {
      doc.text(`${counter}.`, indent - 4, itemY);
      counter++;
    } else {
      doc.setFillColor(...C_BODY);
      doc.circle(indent - 2, itemY - 1, 0.6, 'F');
    }

    const textH = renderFormattedText(doc, item.spans, indent, itemY, textW, FS.body, C_BODY);
    itemY += textH + 1;

    // Page break within list
    if (itemY > PAGE_H - MARGIN_BOTTOM - 5) {
      doc.addPage();
      itemY = MARGIN_TOP;
    }
  }
  return itemY + 2;
}

function cellText(spans: TextSpan[]): string {
  return spans.map(s => s.text).join('').trim();
}

function renderTable(doc: jsPDF, block: PdfBlock, y: number): number {
  const rows = block.tableRows || [];
  if (!rows.length) return y;

  const hCount = block.headerRowCount || 1;
  const head = rows.slice(0, hCount).map(r => r.map(cellText));
  const body = rows.slice(hCount).map(r => r.map(cellText));

  autoTable(doc, {
    startY: y,
    head,
    body,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: C_BODY,
      lineColor: C_BORDER,
      lineWidth: 0.2,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: C_TABLE_HEAD_BG,
      textColor: C_DARK,
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: { fillColor: C_TABLE_ALT },
    margin: { left: MARGIN_X, right: MARGIN_X },
  });

  return ((doc as any).lastAutoTable?.finalY ?? y + 20) + 4;
}

function renderDiagram(doc: jsPDF, block: PdfBlock, y: number): number {
  if (!block.imageData || !block.imageWidth || !block.imageHeight) return y + 4;

  const ratio = block.imageHeight / block.imageWidth;
  let imgW = Math.min(CONTENT_W, 170);
  let imgH = imgW * ratio;

  const maxH = USABLE_H - 10;
  if (imgH > maxH) {
    imgH = maxH;
    imgW = imgH / ratio;
  }

  const imgX = MARGIN_X + (CONTENT_W - imgW) / 2;
  doc.addImage(block.imageData, 'PNG', imgX, y + 2, imgW, imgH);
  return y + imgH + 6;
}

function renderBlockquote(doc: jsPDF, block: PdfBlock, y: number): number {
  const textH = measureFormattedText(doc, block.spans || [], CONTENT_W - 15, FS.body);
  const boxH = textH + 6;

  // Light background
  doc.setFillColor(...C_PRIMARY_LIGHT);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, boxH, 1, 1, 'F');

  // Left accent bar
  doc.setFillColor(...C_PRIMARY);
  doc.rect(MARGIN_X, y, 2, boxH, 'F');

  renderFormattedText(doc, block.spans || [], MARGIN_X + 8, y + 4, CONTENT_W - 15, FS.body, C_BODY);
  return y + boxH + 4;
}

// Replace Unicode box-drawing characters with ASCII equivalents supported by jsPDF fonts
function sanitizeBoxDrawing(text: string): string {
  return text
    .replace(/│/g, '|')
    .replace(/├/g, '|--')
    .replace(/└/g, '`--')
    .replace(/─/g, '-')
    .replace(/┌/g, ',--')
    .replace(/┐/g, '--.')
    .replace(/┘/g, "--'")
    .replace(/┤/g, '--|')
    .replace(/┬/g, '-+-')
    .replace(/┴/g, '-+-')
    .replace(/┼/g, '-+-')
    .replace(/║/g, '||')
    .replace(/═/g, '=')
    .replace(/╔/g, ',==')
    .replace(/╗/g, '==.')
    .replace(/╚/g, '`==')
    .replace(/╝/g, "=='")
    .replace(/╠/g, '|==')
    .replace(/╣/g, '==|')
    .replace(/╦/g, '=+=')
    .replace(/╩/g, '=+=')
    .replace(/╬/g, '=+=')
    .replace(/•/g, '*')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/↔/g, '<->');
}

function renderCodeBlock(doc: jsPDF, block: PdfBlock, y: number): number {
  const text = sanitizeBoxDrawing(block.codeText || '');
  const lines = text.split('\n');
  const lh = 3.5;
  const boxH = lines.length * lh + 6;

  doc.setFillColor(...C_MUTED_BG);
  doc.setDrawColor(...C_BORDER);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, boxH, 1.5, 1.5, 'FD');

  doc.setFont('courier', 'normal');
  doc.setFontSize(FS.code);
  doc.setTextColor(...C_DARK);

  let textY = y + 4;
  for (const line of lines) {
    if (textY > PAGE_H - MARGIN_BOTTOM) {
      doc.addPage();
      textY = MARGIN_TOP;
    }
    doc.text(line, MARGIN_X + 4, textY);
    textY += lh;
  }
  return y + boxH + 4;
}

function renderHr(doc: jsPDF, y: number): number {
  y += 4;
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_X, y, MARGIN_X + CONTENT_W, y);
  return y + 6;
}

// ── Diagram pre-capture ────────────────────────────────────────────
/**
 * Parse a CSS color string to RGB [0-255]. Handles #hex, rgb(), and named colors.
 */
function parseColorToRgb(color: string): [number, number, number] | null {
  const c = color.trim().toLowerCase();
  // Hex
  const hex3 = c.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (hex3) return [parseInt(hex3[1]+hex3[1],16), parseInt(hex3[2]+hex3[2],16), parseInt(hex3[3]+hex3[3],16)];
  const hex6 = c.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/);
  if (hex6) return [parseInt(hex6[1],16), parseInt(hex6[2],16), parseInt(hex6[3],16)];
  // rgb(r, g, b)
  const rgbMatch = c.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) return [+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]];
  return null;
}

/**
 * Relative luminance (0 = black, 1 = white) per WCAG.
 */
function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r/255, g/255, b/255].map(v =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Fix text contrast on SVG shapes based on fill luminance.
 * Dark fills → white text, Light fills → dark text.
 */
function fixSvgTextContrast(svg: Element) {
  svg.querySelectorAll('circle, ellipse, rect, path, polygon').forEach(shape => {
    const fill = shape.getAttribute('fill') || shape.getAttribute('style')?.match(/fill:\s*([^;]+)/)?.[1] || '';
    if (!fill || fill === 'none' || fill === 'transparent') return;
    const rgb = parseColorToRgb(fill);
    if (!rgb) return;
    const lum = luminance(...rgb);
    const parent = shape.closest('g');
    if (!parent) return;
    const textColor = lum < 0.5 ? '#ffffff' : '#1e293b';
    // SVG <text> elements
    parent.querySelectorAll('text, tspan').forEach(t => {
      const textEl = t as SVGElement;
      textEl.setAttribute('fill', textColor);
      textEl.style.fill = textColor;
    });
    // foreignObject HTML content (used by mindmaps)
    parent.querySelectorAll('foreignObject *').forEach(el => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style) {
        htmlEl.style.color = textColor;
      }
    });
  });
}

export async function captureDiagrams(blocks: PdfBlock[]): Promise<void> {
  for (const block of blocks) {
    if (block.type !== 'diagram' || !block.domElement) continue;
    try {
      const canvas = await html2canvas(block.domElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        onclone: (_doc, clonedEl) => {
          clonedEl.querySelectorAll('svg').forEach(svg => fixSvgTextContrast(svg));
        },
      });
      block.imageData = canvas.toDataURL('image/png');
      block.imageWidth = canvas.width;
      block.imageHeight = canvas.height;
    } catch (e) {
      console.warn('Failed to capture diagram:', e);
    }
  }
}

// ── Main rendering loop ────────────────────────────────────────────
export async function renderAllBlocks(doc: jsPDF, blocks: PdfBlock[], versionStr: string): Promise<void> {
  let y = MARGIN_TOP;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const blockH = measureBlock(doc, block);
    const remaining = PAGE_H - MARGIN_BOTTOM - y;

    // Keep heading with following content block
    if (block.type === 'heading' && i + 1 < blocks.length) {
      const nextH = Math.min(measureBlock(doc, blocks[i + 1]), USABLE_H * 0.5);
      if (blockH + nextH > remaining) {
        doc.addPage();
        y = MARGIN_TOP;
      }
    } else if (blockH > remaining && block.type !== 'table') {
      doc.addPage();
      y = MARGIN_TOP;
    }

    // Render block
    switch (block.type) {
      case 'heading':
        y = renderHeading(doc, block, y);
        break;
      case 'paragraph':
        y = renderParagraph(doc, block, y);
        break;
      case 'list':
        y = renderList(doc, block, y);
        break;
      case 'table':
        y = renderTable(doc, block, y);
        break;
      case 'diagram':
        y = renderDiagram(doc, block, y);
        break;
      case 'blockquote':
        y = renderBlockquote(doc, block, y);
        break;
      case 'code':
        y = renderCodeBlock(doc, block, y);
        break;
      case 'hr':
        y = renderHr(doc, y);
        break;
    }

    // Safety: if we're past the bottom margin, new page
    if (y > PAGE_H - MARGIN_BOTTOM && i < blocks.length - 1) {
      doc.addPage();
      y = MARGIN_TOP;
    }
  }

  // Add page numbers + footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(...C_FOOTER);
    doc.text(versionStr, MARGIN_X, PAGE_H - 5);
    doc.text(`Pag. ${p} / ${totalPages}`, PAGE_W - MARGIN_X, PAGE_H - 5, { align: 'right' });
  }
}
