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

    // Colors — use company accent color
    const hexToRgb = (hex) => {
      const r = parseInt(hex.slice(1,3),16);
      const g = parseInt(hex.slice(3,5),16);
      const b = parseInt(hex.slice(5,7),16);
      return [r, g, b];
    };
    const ORANGE = settings?.accent_color ? hexToRgb(settings.accent_color) : [214, 90, 30];
    const DARK   = [30, 30, 30];
    const GRAY   = [110, 110, 110];
    const WHITE  = [255, 255, 255];
    const LGRAY  = [245, 245, 245];

    const ml = 14, mr = pw - 14;

    // ── TOP HEADER BAND ──────────────────────────────────
    doc.setFillColor(...ORANGE);
    doc.rect(0, 0, pw, 3, 'F');

    // Logo (top-left)
    let headerBottom = 14;
    if (settings?.logo_url) {
      try {
        const img = await new Promise((res, rej) => {
          const i = new Image(); i.crossOrigin = 'anonymous';
          i.onload = () => res(i); i.onerror = rej;
          i.src = settings.logo_url;
        });
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        doc.addImage(c.toDataURL('image/png'), 'PNG', ml, 6, 24, 24);
        headerBottom = Math.max(headerBottom, 32);
      } catch {}
    }

    // Company name block (below or beside logo)
    const nameX = settings?.logo_url ? ml + 27 : ml;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...DARK);
    doc.text((settings?.company_name || 'EMPRESA').toUpperCase(), nameX, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    if (settings?.address) { doc.text(settings.address, nameX, 21); }
    if (settings?.phone)   { doc.text(settings.phone,   nameX, 26); }
    if (settings?.email)   { doc.text(settings.email,   nameX, 31); }

    // COTIZACION + folio (top-right box)
    doc.setFillColor(...LGRAY);
    doc.roundedRect(pw - 58, 5, 46, 28, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...DARK);
    doc.text('COTIZACIÓN', pw - 35, 16, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(...ORANGE);
    doc.text(`FOLIO N° ${quote.quote_number || quote.id?.substring(0,6)}`, pw - 35, 23, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(`Fecha: ${quote.date || '-'}`, pw - 35, 29, { align: 'center' });

    // ── ORANGE DIVIDER ────────────────────────────────────
    let y = Math.max(headerBottom, 36);
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(0.8);
    doc.line(ml, y, mr, y);
    y += 7;

    // ── CLIENT INFO ───────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text((quote.customer_name || '-').toUpperCase(), ml, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    if (quote.machine_name) { doc.text(`Equipo: ${quote.machine_name}`, ml, y); y += 5; }
    if (quote.expiry_date)  { doc.text(`Válida hasta: ${quote.expiry_date}`, ml, y); y += 5; }
    if (quote.attended_by)  { doc.text(`Atendido por: ${quote.attended_by}`, ml, y); y += 5; }
    y += 4;

    // ── TABLE ─────────────────────────────────────────────
    const COL = { d: ml, q: 112, u: 140, t: 170 };
    const ROW_H = 8;

    // Table header row
    doc.setFillColor(...ORANGE);
    doc.rect(ml, y, mr - ml, ROW_H, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...WHITE);
    doc.text('DESCRIPCIÓN',    COL.d + 2, y + 5.5);
    doc.text('CANTIDAD',       COL.q,     y + 5.5);
    doc.text('PRECIO UNITARIO', COL.u,    y + 5.5);
    doc.text('TOTAL',          COL.t,     y + 5.5);
    y += ROW_H;

    // Rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    items.forEach((item, i) => {
      const lines = doc.splitTextToSize(item.description || '-', 88);
      const rh = Math.max(ROW_H, lines.length * 5 + 3);
      if (i % 2 === 1) {
        doc.setFillColor(...LGRAY);
        doc.rect(ml, y, mr - ml, rh, 'F');
      }
      doc.setTextColor(...DARK);
      doc.text(lines, COL.d + 2, y + 5.5);
      doc.text(String(item.quantity || 0),  COL.q, y + 5.5);
      doc.text(`$ ${(item.unit_price || 0).toLocaleString('es-CL')}`, COL.u, y + 5.5);
      doc.text(`$ ${((item.quantity||0)*(item.unit_price||0)).toLocaleString('es-CL')}`, COL.t, y + 5.5);
      y += rh;
    });

    // Bottom divider of table
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(0.6);
    doc.line(ml, y, mr, y);
    y += 8;

    // ── TERMS (left) + TOTALS (right) ────────────────────
    const totalsX = 125;
    let notesY = y;

    if (quote.notes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      doc.text('TÉRMINOS & CONDICIONES:', ml, notesY);
      notesY += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      const nlines = doc.splitTextToSize(quote.notes, totalsX - ml - 4);
      doc.text(nlines, ml, notesY);
    }

    // Totals right column
    let ty = y;
    const tRight = mr;
    const tLabelX = totalsX + 2;
    const drawRow = (label, value, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(bold ? 10 : 9);
      doc.setTextColor(...(bold ? DARK : GRAY));
      doc.text(label, tLabelX, ty);
      doc.text(`$ ${value.toLocaleString('es-CL')}`, tRight, ty, { align: 'right' });
      ty += 7;
    };

    drawRow('SUBTOTAL:', subtotal);
    if ((quote.labor_cost || 0) > 0) drawRow('MANO DE OBRA:', quote.labor_cost || 0);
    if ((quote.discount   || 0) > 0) drawRow('DESCUENTO:',  -(quote.discount  || 0));

    // Total final highlighted
    doc.setFillColor(...ORANGE);
    doc.rect(totalsX, ty - 5, mr - totalsX, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...WHITE);
    doc.text('TOTAL FINAL:', tLabelX, ty);
    doc.text(`$ ${(quote.total || 0).toLocaleString('es-CL')}`, tRight, ty, { align: 'right' });

    // ── FOOTER ───────────────────────────────────────────
    const fy = ph - 20;
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(0.4);
    doc.line(ml, fy - 3, mr, fy - 3);

    const fCols = [ml, ml + (mr - ml) / 3, ml + (mr - ml) * 2 / 3];
    const fData = [
      ['UBICACIÓN', settings?.address || '-'],
      ['TELÉFONO / EMAIL', [settings?.phone, settings?.email].filter(Boolean).join('  |  ') || '-'],
      ['RUT / NIT', settings?.tax_id || (settings?.company_name || '-')],
    ];
    fData.forEach(([label, val], i) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...DARK);
      doc.text(label, fCols[i], fy + 2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      doc.setFontSize(7);
      const flines = doc.splitTextToSize(val, 55);
      doc.text(flines, fCols[i], fy + 7);
    });

    // Bottom orange bar
    doc.setFillColor(...ORANGE);
    doc.rect(0, ph - 4, pw, 4, 'F');

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
              {quote.attended_by && <div className="col-span-2"><span className="text-muted-foreground">Atendido por:</span> <span className="font-medium">{quote.attended_by}</span></div>}
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