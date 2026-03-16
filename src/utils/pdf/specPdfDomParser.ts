import { PdfBlock, TextSpan } from './specPdfTypes';

/**
 * Recursively extract formatted text spans from a DOM node.
 */
function extractSpans(node: Node): TextSpan[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    if (text === '') return [];
    return [{ text }];
  }

  const el = node as HTMLElement;
  if (!el.tagName) return [];
  const tag = el.tagName.toLowerCase();

  if ((el as HTMLElement).style?.display === 'none') return [];

  const childSpans: TextSpan[] = [];
  el.childNodes.forEach(child => {
    childSpans.push(...extractSpans(child));
  });

  switch (tag) {
    case 'strong':
    case 'b':
      return childSpans.map(s => ({ ...s, bold: true }));
    case 'em':
    case 'i':
      return childSpans.map(s => ({ ...s, italic: true }));
    case 'code':
      return childSpans.map(s => ({ ...s, code: true }));
    case 'br':
      return [{ text: '\n' }];
    default:
      return childSpans;
  }
}

function walkList(
  listEl: HTMLElement,
  indent: number,
  items: { spans: TextSpan[]; indent: number }[],
) {
  const lis = listEl.querySelectorAll(':scope > li');
  lis.forEach(li => {
    const spans: TextSpan[] = [];
    li.childNodes.forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const childTag = (child as HTMLElement).tagName.toLowerCase();
        if (childTag === 'ul' || childTag === 'ol') {
          walkList(child as HTMLElement, indent + 1, items);
          return;
        }
      }
      spans.push(...extractSpans(child));
    });
    if (spans.length > 0 && spans.some(s => s.text.trim())) {
      items.push({ spans, indent });
    }
  });
}

function parseElement(el: HTMLElement): PdfBlock | PdfBlock[] | null {
  const tag = el.tagName.toLowerCase();

  // Headings
  if (/^h[1-6]$/.test(tag)) {
    return {
      type: 'heading',
      level: Math.min(parseInt(tag[1]), 4),
      spans: extractSpans(el),
    };
  }

  // Paragraph
  if (tag === 'p') {
    const spans = extractSpans(el);
    if (!spans.length || !spans.some(s => s.text.trim())) return null;
    return { type: 'paragraph', spans };
  }

  // Lists
  if (tag === 'ul' || tag === 'ol') {
    const items: { spans: TextSpan[]; indent: number }[] = [];
    walkList(el, 0, items);
    if (!items.length) return null;
    return { type: 'list', ordered: tag === 'ol', items };
  }

  // Table
  if (tag === 'table') {
    const tableRows: TextSpan[][][] = [];
    let headerRowCount = 0;

    const thead = el.querySelector('thead');
    if (thead) {
      thead.querySelectorAll('tr').forEach(tr => {
        const cells: TextSpan[][] = [];
        tr.querySelectorAll('th, td').forEach(cell => cells.push(extractSpans(cell)));
        tableRows.push(cells);
        headerRowCount++;
      });
    }

    const tbody = el.querySelector('tbody');
    (tbody || el).querySelectorAll(':scope > tr').forEach(tr => {
      const cells: TextSpan[][] = [];
      tr.querySelectorAll('th, td').forEach(cell => cells.push(extractSpans(cell)));
      if (cells.length > 0) tableRows.push(cells);
    });

    if (!tableRows.length) return null;
    return { type: 'table', tableRows, headerRowCount };
  }

  // Blockquote
  if (tag === 'blockquote') {
    return { type: 'blockquote', spans: extractSpans(el) };
  }

  // Pre — might contain mermaid diagram or code
  if (tag === 'pre') {
    const svgChild = el.querySelector('svg');
    if (svgChild) {
      return { type: 'diagram', domElement: el };
    }
    return { type: 'code', codeText: el.textContent || '' };
  }

  // Horizontal rule
  if (tag === 'hr') {
    return { type: 'hr' };
  }

  // Div — could be diagram container (MermaidDiagram) or wrapper
  if (tag === 'div') {
    const svgChild = el.querySelector('svg');
    if (svgChild) {
      return { type: 'diagram', domElement: el };
    }
    // Parse children of wrapper divs
    const childBlocks: PdfBlock[] = [];
    el.childNodes.forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const result = parseElement(child as HTMLElement);
        if (result) {
          if (Array.isArray(result)) childBlocks.push(...result);
          else childBlocks.push(result);
        }
      }
    });
    return childBlocks.length > 0 ? childBlocks : null;
  }

  return null;
}

/**
 * Parse the rendered .prose element into an array of PdfBlocks.
 */
export function parseDomToBlocks(proseElement: HTMLElement): PdfBlock[] {
  const blocks: PdfBlock[] = [];
  proseElement.childNodes.forEach(child => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const result = parseElement(child as HTMLElement);
      if (result) {
        if (Array.isArray(result)) blocks.push(...result);
        else blocks.push(result);
      }
    }
  });
  return blocks;
}
