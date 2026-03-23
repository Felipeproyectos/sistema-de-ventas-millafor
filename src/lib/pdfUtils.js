import { jsPDF } from 'jspdf';

export function createPdfDoc(settings, title) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Company header
  if (settings?.company_name) {
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(settings.company_name, pageWidth / 2, y, { align: 'center' });
    y += 7;
  }
  if (settings?.address || settings?.phone || settings?.email) {
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    const info = [settings.address, settings.phone, settings.email].filter(Boolean).join(' | ');
    doc.text(info, pageWidth / 2, y, { align: 'center' });
    y += 5;
  }
  if (settings?.tax_id) {
    doc.setFontSize(8);
    doc.text(`RUT/NIT: ${settings.tax_id}`, pageWidth / 2, y, { align: 'center' });
    y += 5;
  }

  // Separator line
  y += 2;
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // Title
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(title, 15, y);
  y += 4;

  // Date
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-CL')}`, 15, y);
  y += 10;

  return { doc, y, pageWidth };
}

export function addTableHeader(doc, y, cols, pageWidth) {
  doc.setFillColor(30, 41, 59);
  doc.rect(15, y - 4, pageWidth - 30, 8, 'F');
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(255, 255, 255);
  cols.forEach(col => {
    doc.text(col.label, col.x, y);
  });
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  return y + 8;
}

export function checkPageBreak(doc, y, margin = 25) {
  if (y > doc.internal.pageSize.getHeight() - margin) {
    doc.addPage();
    return 20;
  }
  return y;
}

export function getPdfBlobUrl(doc) {
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount || 0);
}