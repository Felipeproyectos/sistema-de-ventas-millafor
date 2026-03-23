import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from 'lucide-react';
import StatusBadge from '../StatusBadge';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPdfDoc, addTableHeader, formatCurrency, getPdfBlobUrl } from '../../lib/pdfUtils';
import PdfPreviewModal from '../PdfPreviewModal';

export default function RepairDetailDialog({ repair, onClose }) {
  const [settings, setSettings] = useState(null);
  const [pdfPreview, setPdfPreview] = useState({ open: false, url: null, filename: '' });

  useEffect(() => {
    base44.entities.CompanySettings.list().then(s => { if (s.length) setSettings(s[0]); });
  }, []);

  if (!repair) return null;

  const handlePrint = () => {
    const { doc, y: startY, pageWidth } = createPdfDoc(settings, 'ORDEN DE REPARACIÓN');
    let y = startY;

    doc.setFontSize(10);
    doc.text(`Orden: #${repair.order_number || repair.id?.substring(0, 6)}`, 15, y);
    doc.text(`Fecha: ${repair.date || '-'}`, pageWidth - 15, y, { align: 'right' });
    y += 6;
    doc.text(`Cliente: ${repair.customer_name || '-'}`, 15, y); y += 5;
    doc.text(`Equipo: ${repair.machine_name || '-'}`, 15, y); y += 5;
    doc.text(`Estado: ${repair.status}`, 15, y); y += 8;

    if (repair.problem_description) {
      doc.setFont(undefined, 'bold');
      doc.text('Problema:', 15, y); y += 5;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(repair.problem_description, pageWidth - 30);
      doc.text(lines, 15, y); y += lines.length * 4 + 4;
    }

    if (repair.solution_description) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Solución:', 15, y); y += 5;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(repair.solution_description, pageWidth - 30);
      doc.text(lines, 15, y); y += lines.length * 4 + 4;
    }

    if (repair.parts_used?.length) {
      doc.setFontSize(10);
      y += 3;
      y = addTableHeader(doc, y, [
        { label: 'Repuesto', x: 17 },
        { label: 'Cant', x: 110 },
        { label: 'Precio', x: 135 },
        { label: 'Subtotal', x: 165 },
      ], pageWidth);

      doc.setFontSize(9);
      repair.parts_used.forEach(p => {
        doc.text(p.product_name || '-', 17, y);
        doc.text(String(p.quantity || 0), 110, y);
        doc.text(formatCurrency(p.unit_price), 135, y);
        doc.text(formatCurrency((p.quantity || 0) * (p.unit_price || 0)), 165, y);
        y += 6;
      });
    }

    y += 6;
    doc.setFontSize(10);
    doc.text(`Mano de obra: ${formatCurrency(repair.labor_cost)}`, pageWidth - 15, y, { align: 'right' }); y += 6;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL: ${formatCurrency(repair.total)}`, pageWidth - 15, y, { align: 'right' });

    const filename = `orden-${repair.order_number || repair.id?.substring(0, 6)}.pdf`;
    setPdfPreview({ open: true, url: getPdfBlobUrl(doc), filename });
  };

  return (
    <>
      <Dialog open={!!repair} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Orden #{repair.order_number || repair.id?.substring(0, 6)}</span>
              <StatusBadge status={repair.status} />
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{repair.customer_name}</span></div>
              <div><span className="text-muted-foreground">Equipo:</span> <span className="font-medium">{repair.machine_name}</span></div>
              <div><span className="text-muted-foreground">Fecha:</span> <span className="font-medium">{repair.date}</span></div>
              <div><span className="text-muted-foreground">Total:</span> <span className="font-bold text-primary">${(repair.total || 0).toLocaleString('es-CL')}</span></div>
            </div>

            {repair.problem_description && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Problema</p>
                <p className="text-sm bg-secondary/50 rounded-lg p-3">{repair.problem_description}</p>
              </div>
            )}

            {repair.solution_description && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Solución</p>
                <p className="text-sm bg-secondary/50 rounded-lg p-3">{repair.solution_description}</p>
              </div>
            )}

            {repair.parts_used?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Repuestos</p>
                <div className="space-y-1">
                  {repair.parts_used.map((p, i) => (
                    <div key={i} className="flex justify-between text-sm bg-secondary/30 rounded-lg px-3 py-2">
                      <span>{p.product_name} x{p.quantity}</span>
                      <span className="font-medium">${((p.quantity || 0) * (p.unit_price || 0)).toLocaleString('es-CL')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handlePrint} variant="outline" className="w-full gap-2">
              <Printer className="h-4 w-4" /> Ver PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <PdfPreviewModal
        open={pdfPreview.open}
        onOpenChange={open => setPdfPreview(p => ({ ...p, open }))}
        blobUrl={pdfPreview.url}
        filename={pdfPreview.filename}
      />
    </>
  );
}