import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from 'lucide-react';
import StatusBadge from '../StatusBadge';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPdfDoc, addTableHeader, formatCurrency, getPdfBlobUrl } from '../../lib/pdfUtils';
import PdfPreviewModal from '../PdfPreviewModal';

export default function SaleDetailDialog({ sale, onClose }) {
  const [settings, setSettings] = useState(null);
  const [pdfPreview, setPdfPreview] = useState({ open: false, url: null, filename: '' });

  useEffect(() => {
    base44.entities.CompanySettings.list().then(s => { if (s.length) setSettings(s[0]); });
  }, []);

  if (!sale) return null;

  const handlePrint = () => {
    const { doc, y: startY, pageWidth } = createPdfDoc(settings, 'ORDEN DE VENTA');
    let y = startY;

    doc.setFontSize(10);
    doc.text(`Venta: #${sale.order_number || sale.id?.substring(0, 6)}`, 15, y);
    doc.text(`Fecha: ${sale.date || '-'}`, pageWidth - 15, y, { align: 'right' });
    y += 6;
    doc.text(`Cliente: ${sale.customer_name || '-'}`, 15, y); y += 10;

    if (sale.items?.length) {
      y = addTableHeader(doc, y, [
        { label: 'Producto', x: 17 },
        { label: 'Cant', x: 110 },
        { label: 'Precio', x: 135 },
        { label: 'Subtotal', x: 165 },
      ], pageWidth);

      doc.setFontSize(9);
      sale.items.forEach(item => {
        doc.text(item.product_name || '-', 17, y);
        doc.text(String(item.quantity || 0), 110, y);
        doc.text(formatCurrency(item.unit_price), 135, y);
        doc.text(formatCurrency((item.quantity || 0) * (item.unit_price || 0)), 165, y);
        y += 6;
      });
    }

    y += 6;
    doc.setFontSize(10);
    if (sale.discount) {
      doc.text(`Descuento: -${formatCurrency(sale.discount)}`, pageWidth - 15, y, { align: 'right' }); y += 6;
    }
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL: ${formatCurrency(sale.total)}`, pageWidth - 15, y, { align: 'right' });

    const filename = `venta-${sale.order_number || sale.id?.substring(0, 6)}.pdf`;
    setPdfPreview({ open: true, url: getPdfBlobUrl(doc), filename });
  };

  return (
    <Dialog open={!!sale} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Venta #{sale.order_number || sale.id?.substring(0, 6)}</span>
            <StatusBadge status={sale.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{sale.customer_name}</span></div>
            <div><span className="text-muted-foreground">Fecha:</span> <span className="font-medium">{sale.date}</span></div>
          </div>

          {sale.items?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Productos</p>
              <div className="space-y-1">
                {sale.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm bg-secondary/30 rounded-lg px-3 py-2">
                    <span>{item.product_name} x{item.quantity}</span>
                    <span className="font-medium">${((item.quantity || 0) * (item.unit_price || 0)).toLocaleString('es-CL')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center bg-primary/10 rounded-lg p-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-bold text-primary">${(sale.total || 0).toLocaleString('es-CL')}</span>
          </div>

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
  );
}