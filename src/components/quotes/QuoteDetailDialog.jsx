import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { Printer, CheckCircle2, XCircle, ShoppingCart, Wrench } from 'lucide-react';
import { toast } from "sonner";
import { createPdfDoc, formatCurrency, getPdfBlobUrl, addTableHeader } from '../../lib/pdfUtils';
import PdfPreviewModal from '../PdfPreviewModal';

const statusMap = {
  pendiente: { label: 'Pendiente', class: 'bg-warning/10 text-warning' },
  aceptada: { label: 'Aceptada', class: 'bg-accent/10 text-accent' },
  rechazada: { label: 'Rechazada', class: 'bg-destructive/10 text-destructive' },
};

export default function QuoteDetailDialog({ quote, onClose, onRefresh }) {
  const [settings, setSettings] = useState(null);
  const [pdfPreview, setPdfPreview] = useState({ open: false, url: null });
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    base44.entities.CompanySettings.list().then(s => { if (s.length) setSettings(s[0]); });
  }, []);

  if (!quote) return null;

  const subtotal = (quote.items || []).reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);

  const handlePrint = () => {
    const { doc, y: startY, pageWidth } = createPdfDoc(settings, 'COTIZACIÓN');
    let y = startY;

    doc.setFontSize(10);
    doc.text(`Cotización: #${quote.quote_number || quote.id?.substring(0, 6)}`, 15, y);
    doc.text(`Fecha: ${quote.date || '-'}`, pageWidth - 15, y, { align: 'right' });
    y += 6;
    doc.text(`Cliente: ${quote.customer_name || '-'}`, 15, y);
    doc.text(`Válida hasta: ${quote.expiry_date || '-'}`, pageWidth - 15, y, { align: 'right' });
    y += 6;
    if (quote.machine_name) { doc.text(`Equipo: ${quote.machine_name}`, 15, y); y += 6; }
    y += 4;

    if (quote.items?.length) {
      y = addTableHeader(doc, y, [
        { label: 'Descripción', x: 17 },
        { label: 'Cant', x: 120 },
        { label: 'Precio Unit.', x: 140 },
        { label: 'Subtotal', x: 168 },
      ], pageWidth);
      doc.setFontSize(9);
      quote.items.forEach(item => {
        doc.text(item.description || '-', 17, y);
        doc.text(String(item.quantity || 0), 120, y);
        doc.text(formatCurrency(item.unit_price), 140, y);
        doc.text(formatCurrency((item.quantity || 0) * (item.unit_price || 0)), 168, y);
        y += 6;
      });
    }

    y += 6;
    doc.setFontSize(10);
    if (quote.labor_cost > 0) {
      doc.text(`Mano de obra: ${formatCurrency(quote.labor_cost)}`, pageWidth - 15, y, { align: 'right' }); y += 6;
    }
    if (quote.discount > 0) {
      doc.text(`Descuento: -${formatCurrency(quote.discount)}`, pageWidth - 15, y, { align: 'right' }); y += 6;
    }
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL: ${formatCurrency(quote.total)}`, pageWidth - 15, y, { align: 'right' });
    y += 10;
    if (quote.notes) {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text('Condiciones:', 15, y); y += 5;
      doc.text(quote.notes, 15, y, { maxWidth: pageWidth - 30 });
    }

    setPdfPreview({ open: true, url: getPdfBlobUrl(doc) });
  };

  const handleAccept = async () => {
    await base44.entities.Quote.update(quote.id, { status: 'aceptada' });
    toast.success('Cotización aceptada');
    onRefresh();
    onClose();
  };

  const handleReject = async () => {
    await base44.entities.Quote.update(quote.id, { status: 'rechazada' });
    toast.success('Cotización rechazada');
    onRefresh();
    onClose();
  };

  const convertToSale = async () => {
    if (quote.converted_to) { toast.error('Ya fue convertida'); return; }
    setConverting(true);
    const sale = await base44.entities.SaleOrder.create({
      customer_id: quote.customer_id,
      customer_name: quote.customer_name,
      date: new Date().toISOString().split('T')[0],
      items: (quote.items || []).map(i => ({
        product_id: '', product_name: i.description, quantity: i.quantity, unit_price: i.unit_price, purchase_price: 0
      })),
      subtotal,
      discount: quote.discount || 0,
      total: quote.total,
      status: 'pendiente',
      notes: `Generada desde cotización #${quote.quote_number}`,
      order_number: `VT-${Date.now().toString().slice(-6)}`,
    });
    await base44.entities.Quote.update(quote.id, { status: 'aceptada', converted_to: sale.id });
    toast.success('Convertida a venta exitosamente');
    setConverting(false);
    onRefresh();
    onClose();
  };

  const convertToRepair = async () => {
    if (quote.converted_to) { toast.error('Ya fue convertida'); return; }
    setConverting(true);
    const repair = await base44.entities.RepairOrder.create({
      customer_id: quote.customer_id,
      customer_name: quote.customer_name,
      machine_id: quote.machine_id || '',
      machine_name: quote.machine_name || '',
      date: new Date().toISOString().split('T')[0],
      problem_description: (quote.items || []).map(i => i.description).join(', '),
      status: 'pendiente',
      labor_cost: quote.labor_cost || 0,
      parts_used: [],
      total: quote.total,
      notes: `Generada desde cotización #${quote.quote_number}`,
      order_number: `OR-${Date.now().toString().slice(-6)}`,
    });
    await base44.entities.Quote.update(quote.id, { status: 'aceptada', converted_to: repair.id });
    toast.success('Convertida a reparación exitosamente');
    setConverting(false);
    onRefresh();
    onClose();
  };

  const st = statusMap[quote.status] || statusMap.pendiente;

  return (
    <>
      <Dialog open={!!quote} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Cotización #{quote.quote_number || quote.id?.substring(0, 6)}</span>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${st.class}`}>{st.label}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{quote.customer_name}</span></div>
              <div><span className="text-muted-foreground">Fecha:</span> <span className="font-medium">{quote.date}</span></div>
              <div><span className="text-muted-foreground">Válida hasta:</span> <span className="font-medium">{quote.expiry_date || '-'}</span></div>
              <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium capitalize">{quote.type === 'reparacion' ? 'Reparación' : 'Venta'}</span></div>
              {quote.machine_name && <div className="col-span-2"><span className="text-muted-foreground">Equipo:</span> <span className="font-medium">{quote.machine_name}</span></div>}
            </div>

            {quote.items?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Ítems</p>
                <div className="space-y-1">
                  {quote.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm bg-secondary/30 rounded-lg px-3 py-2">
                      <span>{item.description} x{item.quantity}</span>
                      <span className="font-medium">${((item.quantity || 0) * (item.unit_price || 0)).toLocaleString('es-CL')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(quote.labor_cost > 0 || quote.discount > 0) && (
              <div className="text-sm space-y-1">
                {quote.labor_cost > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Mano de obra</span><span>${(quote.labor_cost || 0).toLocaleString('es-CL')}</span></div>}
                {quote.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Descuento</span><span className="text-destructive">-${(quote.discount || 0).toLocaleString('es-CL')}</span></div>}
              </div>
            )}

            <div className="flex justify-between items-center bg-primary/10 rounded-lg p-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-bold text-primary">${(quote.total || 0).toLocaleString('es-CL')}</span>
            </div>

            {quote.notes && <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3">{quote.notes}</p>}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handlePrint} variant="outline" className="gap-2 flex-1">
                <Printer className="h-4 w-4" /> Ver PDF
              </Button>
            </div>

            {quote.status === 'pendiente' && !quote.converted_to && (
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleAccept} variant="outline" className="gap-2 border-accent/40 text-accent hover:bg-accent/10">
                  <CheckCircle2 className="h-4 w-4" /> Aceptar
                </Button>
                <Button onClick={handleReject} variant="outline" className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10">
                  <XCircle className="h-4 w-4" /> Rechazar
                </Button>
              </div>
            )}

            {(quote.status === 'aceptada' && !quote.converted_to) && (
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={convertToSale} disabled={converting} className="gap-2 bg-primary">
                  <ShoppingCart className="h-4 w-4" /> Convertir a Venta
                </Button>
                <Button onClick={convertToRepair} disabled={converting} variant="outline" className="gap-2">
                  <Wrench className="h-4 w-4" /> Convertir a Reparación
                </Button>
              </div>
            )}

            {quote.converted_to && (
              <p className="text-xs text-center text-accent bg-accent/10 rounded-lg p-2">✓ Esta cotización ya fue convertida a una orden</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PdfPreviewModal
        open={pdfPreview.open}
        onOpenChange={open => setPdfPreview(p => ({ ...p, open }))}
        blobUrl={pdfPreview.url}
        filename={`cotizacion-${quote.quote_number || quote.id?.substring(0, 6)}.pdf`}
      />
    </>
  );
}