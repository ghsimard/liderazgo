import jsPDF from 'jspdf';

/**
 * Renders a clean title page with subtle IP notice at the bottom.
 */
export function addTitlePage(doc: jsPDF) {
  const pdfW = 210;
  const pdfH = 297;
  const centerX = pdfW / 2;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pdfW, pdfH, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(0, 0, 0);
  doc.text('Especificaciones de la Plataforma', centerX, 95, { align: 'center' });
  doc.text('RLT / CLT', centerX, 110, { align: 'center' });

  // Divider
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(50, 120, pdfW - 50, 120);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Documento de Especificaciones Tecnicas', centerX, 135, { align: 'center' });

  // Date
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.setFontSize(11);
  doc.text(dateStr, centerX, 150, { align: 'center' });

  // Subtle IP notice
  const noticeY = pdfH - 38;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(55, noticeY, pdfW - 55, noticeY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text(
    'Propiedad intelectual de Ghislain Simard (CE 6798900). Todos los derechos reservados.',
    centerX, noticeY + 6, { align: 'center' },
  );
  doc.text(
    'Prohibida la reproduccion total o parcial sin consentimiento escrito del autor.',
    centerX, noticeY + 11, { align: 'center' },
  );
}
