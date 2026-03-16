import jsPDF from 'jspdf';
import { parseDomToBlocks } from './pdf/specPdfDomParser';
import { captureDiagrams, renderAllBlocks } from './pdf/specPdfBlockRenderer';
import { addTitlePage } from './pdf/specPdfTitlePage';

/**
 * Generates a PDF with native editable text (not rasterized images).
 * Diagrams are embedded as images; all other content uses jsPDF text API.
 */
export async function generarPDFSpecifications(
  _markdownContent: string,
  articleElement?: HTMLElement | null,
): Promise<void> {
  if (!articleElement) {
    throw new Error('Article element is required for PDF generation');
  }

  // Find the prose container
  const proseEl = articleElement.querySelector('.prose') as HTMLElement;
  if (!proseEl) {
    throw new Error('Prose element not found inside article');
  }

  // Version string for footer
  const now = new Date();
  const versionStr = `Especificaciones RLT/CLT — ${now.toLocaleDateString('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })} ${now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;

  // 1. Parse DOM into structured blocks
  const blocks = parseDomToBlocks(proseEl);

  // 2. Pre-capture all diagram SVGs as images
  await captureDiagrams(blocks);

  // 3. Create PDF document
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // 4. Title page
  addTitlePage(doc);

  // 5. Content pages
  doc.addPage();
  await renderAllBlocks(doc, blocks, versionStr);

  // 6. Save
  doc.save('Especificaciones_Plataforma_RLT_CLT.pdf');
}
