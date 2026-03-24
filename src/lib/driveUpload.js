import { base44 } from '@/api/base44Client';

/**
 * Uploads a jsPDF doc to Google Drive
 * @param {Object} doc - jsPDF instance
 * @param {string} filename - e.g. 'reparacion-001.pdf'
 * @param {string} category - 'reparaciones' | 'cotizaciones' | 'ventas' | 'puesta_en_marcha'
 */
export async function uploadDocToDrive(doc, filename, category) {
  const pdfBase64 = doc.output('datauristring');
  const response = await base44.functions.invoke('uploadToDrive', { pdfBase64, filename, category });
  return response.data;
}