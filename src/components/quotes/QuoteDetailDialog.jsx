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

  const items = quote.items || [];
  const subtotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);

  const handlePrint = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const accent = [230, 100, 30]; // orange
    const dark = [30, 30, 30];
    const gray = [120, 120, 120];
    const lightGray = [240, 240, 240];

    // Top orange bar
    doc.setFillColor(...accent);
    doc.rect(0, 0, pw, 4, 'F');

    // Left orange accent stripe
    doc.setFillColor(...accent);
    doc.rect(0, 4, 4, 60, 'F');

    // Logo
    let logoY = 10;
    if (settings?.logo_url) {
      try {
        const img = await new Promise((res, rej) => {
          const i = new Image();
          i.crossOrigin = 'anonymous';
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = settings.logo_url;
        });
        const canvas = document.createElement('canvas');
        canvas.width = i.width; canvas.height = i.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 8, 8, 30, 18);
        logoY = 30;
      } catch {}
    }

    // Company name & tagline
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...dark);
    doc.text((settings?.company_name || 'EMPRESA').toUpperCase(), 8, logoY + 2);
    if (settings?.address || settings?.phone) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...gray);
      if (settings?.address) doc.text(settings.address, 8, logoY + 7);
      if (settings?.phone) doc.text(settings.phone, 8, logoY + 11);
      if (settings?.email) doc.text(settings.email, 8, logoY + 15);
    }

    // COTIZACIÓN title + folio (top right)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...dark);
    doc.text('COTIZACIÓN', pw - 14, 16, { align: 'right' });
    doc.setFontSize(10);
    doc.setTextColor(...accent);
    doc.text(`FOLIO N° ${quote.quote_number || quote.id?.substring(0, 6)}`, pw - 14, 23, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text(`Fecha: ${quote.date || '-'}`, pw - 14, 29, { align: 'right' });
    if (quote.expiry_date) doc.text(`Válida hasta: ${quote.expiry_date}`, pw - 14, 34, { align: 'right' });

    // Divider
    let y = 66;
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.5);
    doc.line(8, y, pw - 8, y);
    y += 7;

    // Client info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.text((quote.customer_name || '-').toUpperCase(), 8, y); y += 5;
    if (quote.machine_name) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...gray);
      doc.text(`Equipo: ${quote.machine_name}`, 8, y); y += 5;
    }
    y += 4;

    // Table header
    const colX = { desc: 8, cant: 110, price: 138, total: 170 };
    doc.setFillColor(...accent);
    doc.rect(8, y - 5, pw - 16, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('DESCRIPCIÓN', colX.desc + 2, y);
    doc.text('CANTIDAD', colX.cant, y);
    doc.text('PRECIO UNITARIO', colX.price, y);
    doc.text('TOTAL', colX.total, y);
    y += 5;

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let rowAlt = false;
    for (const item of items) {
      if (rowAlt) {
        doc.setFillColor(...lightGray);
        doc.rect(8, y - 4, pw - 16, 7, 'F');
      }
      rowAlt = !rowAlt;
      doc.setTextColor(...dark);
      const descLines = doc.splitTextToSize(item.description || '-', 95);
      doc.text(descLines, colX.desc + 2, y);
      doc.text(String(item.quantity || 0), colX.cant + 4, y);
      doc.text(`$ ${(item.unit_price || 0).toLocaleString('es-CL')}`, colX.price, y);
      doc.text(`$ ${((item.quantity || 0) * (item.unit_price || 0)).toLocaleString('es-CL')}`, colX.total, y);
      y += Math.max(7, descLines.length * 5);
    }

    // Divider
    y += 3;
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.3);
    doc.line(8, y, pw - 8, y);
    y += 8;

    // Notes / Terms left side
    if (quote.notes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...dark);
      doc.text('TÉRMINOS & CONDICIONES:', 8, y); y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...gray);
      const noteLines = doc.splitTextToSize(quote.notes, 90);
      doc.text(noteLines, 8, y);
    }

    // Totals right side
    const totY0 = y - 8;
    const totX = pw - 70;
    const valX = pw - 14;
    const drawTotalRow = (label, value, bold = false, color = dark) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(bold ? 10 : 9);
      doc.setTextColor(...color);
      doc.text(label, totX, totY0 + drawTotalRow._i * 7);
      doc.text(`$ ${value.toLocaleString('es-CL')}`, valX, totY0 + drawTotalRow._i * 7, { align: 'right' });
      drawTotalRow._i++;
    };
    drawTotalRow._i = 0;
    drawTotalRow('SUBTOTAL:', subtotal);
    if (quote.labor_cost > 0) drawTotalRow('MANO DE OBRA:', quote.labor_cost);
    if (quote.discount > 0) drawTotalRow('DESCUENTO:', -quote.discount);
    // Final total highlight box
    const ftY = totY0 + drawTotalRow._i * 7;
    doc.setFillColor(...accent);
    doc.rect(totX - 4, ftY - 5, pw - totX + 12, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL FINAL:', totX, ftY);
    doc.text(`$ ${(quote.total || 0).toLocaleString('es-CL')}`, valX, ftY, { align: 'right' });

    // Footer
    const fy = ph - 18;
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.5);
    doc.line(8, fy - 4, pw - 8, fy - 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...dark);
    const cols3 = [8, pw / 3 + 4, (pw * 2) / 3 + 4];
    const footItems = [
      ['UBICACIÓN', settings?.address || '-'],
      ['TELÉFONO', settings?.phone || '-'],
      ['EMAIL', settings?.email || '-'],
    ];
    footItems.forEach(([label, val], i) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...dark);
      doc.text(label + ':', cols3[i], fy + 2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...gray);
      doc.setFontSize(7.5);
      const wrapped = doc.splitTextToSize(val, 55);
      doc.text(wrapped, cols3[i], fy + 7);
      doc.setFontSize(8);
    });

    setPdfPreview({ open: true, url: getPdfBlobUrl(doc) });
  };

  const handleAccept = async () => {
    await base44.entities.Quote.update(quote.id, { status: 'aceptada' });
    toast.success('Cotización aceptada');
    onRefresh(); onClose();
  };

  const handleReject = async () => {
    await base44.entities.Quote.update(quote.id, { status: 'rechazada' });
    toast.success('Cotización rechazada');
    onRefresh(); onClose();
  };

  // Convert to Sale — links products by product_id if present
  const convertToSale = async () => {
    if (quote.converted_to) { toast.error('Ya fue convertida'); return; }
    setConverting(true);
    const saleItems = items.map(i => ({
      product_id: i.product_id || '',
      product_name: i.description || '',
      quantity: i.quantity || 1,
      unit_price: i.unit_price || 0,
      purchase_price: i.purchase_price || 0,
    }));
    const sale = await base44.entities.SaleOrder.create({
      customer_id: quote.customer_id,
      customer_name: quote.customer_name,
      date: new Date().toISOString().split('T')[0],
      order_number: `VT-${Date.now().toString().slice(-6)}`,
      items: saleItems,
      subtotal,
      discount: quote.discount || 0,
      total: quote.total,
      status: 'pendiente',
      notes: `Generada desde cotización #${quote.quote_number}`,
    });
    // Deduct stock for products
    for (const item of saleItems) {
      if (item.product_id && item.quantity > 0) {
        const prod = await base44.entities.Product.filter({ id: item.product_id });
        if (prod.length) {
          await base44.entities.Product.update(item.product_id, {
            stock: Math.max(0, (prod[0].stock || 0) - item.quantity)
          });
        }
      }
    }
    await base44.entities.Quote.update(quote.id, { status: 'aceptada', converted_to: sale.id });
    toast.success('Convertida a venta — stock actualizado');
    setConverting(false); onRefresh(); onClose();
  };

  // Convert to Repair — maps items as parts_used with product_id
  const convertToRepair = async () => {
    if (quote.converted_to) { toast.error('Ya fue convertida'); return; }
    setConverting(true);
    const parts = items.map(i => ({
      product_id: i.product_id || '',
      product_name: i.description || '',
      quantity: i.quantity || 1,
      unit_price: i.unit_price || 0,
    }));
    const repair = await base44.entities.RepairOrder.create({
      customer_id: quote.customer_id,
      customer_name: quote.customer_name,
      machine_id: quote.machine_id || '',
      machine_name: quote.machine_name || '',
      date: new Date().toISOString().split('T')[0],
      order_number: `OR-${Date.now().toString().slice(-6)}`,
      problem_description: items.map(i => i.description).join(', '),
      status: 'pendiente',
      labor_cost: quote.labor_cost || 0,
      parts_used: parts,
      total: quote.total,
      notes: `Generada desde cotización #${quote.quote_number}`,
    });
    // Deduct stock for parts with product_id
    for (const part of parts) {
      if (part.product_id && part.quantity > 0) {
        const prods = await base44.entities.Product.filter({ id: part.product_id });
        if (prods.length) {
          await base44.entities.Product.update(part.product_id, {
            stock: Math.max(0, (prods[0].stock || 0) - part.quantity)
          });
        }
      }
    }
    await base44.entities.Quote.update(quote.id, { status: 'aceptada', converted_to: repair.id });
    toast.success('Convertida a reparación — stock actualizado');
    setConverting(false); onRefresh(); onClose();
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
              <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{quote.type === 'reparacion' ? 'Reparación' : 'Venta'}</span></div>
              {quote.machine_name && <div className="col-span-2"><span className="text-muted-foreground">Equipo:</span> <span className="font-medium">{quote.machine_name}</span></div>}
            </div>

            {items.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Ítems</p>
                <div className="space-y-1">
                  {items.map((item, i) => (
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

            <Button onClick={handlePrint} variant="outline" className="gap-2 w-full">
              <Printer className="h-4 w-4" /> Ver PDF
            </Button>

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

            {quote.status === 'aceptada' && !quote.converted_to && (
              <div className="space-y-2">
                <p className="text-xs text-center text-muted-foreground">Convertir a orden:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={convertToSale} disabled={converting} className="gap-2">
                    <ShoppingCart className="h-4 w-4" /> Venta
                  </Button>
                  <Button onClick={convertToRepair} disabled={converting} variant="outline" className="gap-2">
                    <Wrench className="h-4 w-4" /> Reparación
                  </Button>
                </div>
                <p className="text-[10px] text-center text-muted-foreground">Al convertir se descuenta el stock automáticamente</p>
              </div>
            )}

            {quote.converted_to && (
              <p className="text-xs text-center text-accent bg-accent/10 rounded-lg p-2">✓ Cotización convertida a orden — sincronizada con el sistema</p>
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