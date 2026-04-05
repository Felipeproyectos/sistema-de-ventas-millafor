import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Loader2, CloudUpload } from 'lucide-react';
import { uploadDocToDrive } from '../../lib/driveUpload';
import { toast } from 'sonner';
import StatusBadge from '../StatusBadge';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getPdfBlobUrl } from '../../lib/pdfUtils';
import PdfPreviewModal from '../PdfPreviewModal';

export default function RepairDetailDialog({ repair, onClose }) {
  const [settings, setSettings] = useState(null);
  const [machineData, setMachineData] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [pdfPreview, setPdfPreview] = useState({ open: false, url: null, filename: '' });
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    base44.entities.CompanySettings.list().then(s => { if (s.length) setSettings(s[0]); });
    if (repair?.customer_id) {
      base44.entities.Customer.filter({ id: repair.customer_id }).then(r => { if (r.length) setCustomerData(r[0]); }).catch(() => {});
    }
  }, [repair?.customer_id]);

  useEffect(() => {
    // Prefer data stored on the repair itself; fallback to fetching from Machine entity
    if (repair?.machine_brand || repair?.machine_model || repair?.machine_serial || repair?.machine_type) {
      setMachineData({ brand: repair.machine_brand, model: repair.machine_model, serial_number: repair.machine_serial, type: repair.machine_type });
    } else if (repair?.machine_id) {
      base44.entities.Machine.filter({ id: repair.machine_id }).then(ms => { if (ms.length) setMachineData(ms[0]); }).catch(() => {});
    }
  }, [repair]);

  if (!repair) return null;

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const ml = 12, mr = pw - 12;
      const W = mr - ml;
      const isFinalizada = repair.status === 'finalizada';

      // Color palette
      const hexToRgb = (hex) => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
      const ACCENT = settings?.accent_color ? hexToRgb(settings.accent_color) : [59, 130, 246];
      const DARK = [15, 23, 42];
      const GRAY = [100, 116, 139];
      const LGRAY = [248, 250, 252];
      const WHITE = [255, 255, 255];
      const BORDER = [226, 232, 240];

      // ── TOP ACCENT BAR ──
      doc.setFillColor(...ACCENT);
      doc.rect(0, 0, pw, 5, 'F');

      // ── LOGO + COMPANY ──
      let logoRight = ml;
      if (settings?.logo_url) {
        try {
          const img = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin='anonymous'; i.onload=()=>res(i); i.onerror=rej; i.src=settings.logo_url; });
          const c = document.createElement('canvas'); c.width=img.width; c.height=img.height;
          c.getContext('2d').drawImage(img,0,0);
          doc.addImage(c.toDataURL('image/png'),'PNG', ml, 8, 34, 34);
          logoRight = ml + 39;
        } catch {}
      }

      // Company name
      doc.setFont('helvetica','bold'); doc.setFontSize(17); doc.setTextColor(...DARK);
      doc.text((settings?.company_name || 'EMPRESA').toUpperCase(), logoRight, 17);
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...GRAY);
      let cy = 23;
      if (settings?.address) { doc.text(settings.address, logoRight, cy); cy += 4.5; }
      if (settings?.phone)   { doc.text(settings.phone, logoRight, cy); cy += 4.5; }
      if (settings?.email)   { doc.text(settings.email, logoRight, cy); cy += 4.5; }
      if (settings?.tax_id)  { doc.setFont('helvetica','bold'); doc.text(`RUT: ${settings.tax_id}`, logoRight, cy); doc.setFont('helvetica','normal'); cy += 4.5; }
      if (settings?.legal_rep) { doc.text(`Rep. Legal: ${settings.legal_rep}`, logoRight, cy); cy += 4.5; }

      // ── ORDER BADGE (top right) ──
      const badgeX = mr - 58;
      doc.setFillColor(...LGRAY);
      doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
      doc.roundedRect(badgeX, 8, 58, 32, 2, 2, 'FD');
      doc.setFillColor(...ACCENT); doc.roundedRect(badgeX, 8, 58, 9, 2, 2, 'F'); doc.rect(badgeX, 13, 58, 4, 'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...WHITE);
      doc.text('ORDEN DE SERVICIO', badgeX + 29, 14, { align:'center' });
      doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(...ACCENT);
      doc.text(repair.order_number || repair.id?.substring(0,8) || '-', badgeX + 29, 25, { align:'center' });
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...GRAY);
      doc.text(`Fecha: ${repair.date || '-'}`, badgeX + 29, 31, { align:'center' });
      const statusLabel = repair.status === 'pendiente' ? 'PENDIENTE' : repair.status === 'en_proceso' ? 'EN PROCESO' : 'FINALIZADA';
      doc.text(`Estado: ${statusLabel}`, badgeX + 29, 36, { align:'center' });

      let y = 47;

      // ── DIVIDER ──
      doc.setDrawColor(...ACCENT); doc.setLineWidth(0.6);
      doc.line(ml, y, mr, y); y += 6;

      // ── SECTION HELPER ──
      const drawSectionHeader = (title, yPos) => {
        doc.setFillColor(...ACCENT);
        doc.roundedRect(ml, yPos, W, 7, 1, 1, 'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...WHITE);
        doc.text(title, ml + 4, yPos + 5);
        return yPos + 7;
      };

      // ── CLIENT + ORDER INFO (2 columns) ──
      const colW = W / 2 - 2;
      const leftX = ml, rightX = ml + colW + 4;
      const infoH = 44 + (customerData?.address ? 6 : 0) + (customerData?.rut || customerData?.notes?.startsWith('RUT:') ? 6 : 0);

      // Left box - client
      doc.setFillColor(...LGRAY); doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
      doc.roundedRect(leftX, y, colW, infoH, 1.5, 1.5, 'FD');
      doc.setFillColor(...ACCENT); doc.roundedRect(leftX, y, colW, 7, 1.5, 1.5, 'F'); doc.rect(leftX, y+4, colW, 3, 'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...WHITE);
      doc.text('DATOS DEL CLIENTE', leftX + colW/2, y + 5, { align:'center' });

      const rut = customerData?.rut || (customerData?.notes?.startsWith('RUT:') ? customerData.notes.replace('RUT: ', '') : '');
      const clientRows = [
        ['NOMBRE', repair.customer_name || '-'],
        ['TELÉFONO', customerData?.phone || '-'],
        ['EMAIL', customerData?.email || '-'],
        ['DIRECCIÓN', customerData?.address || '-'],
        ...(rut ? [['RUT', rut]] : []),
      ];
      clientRows.forEach(([lbl, val], i) => {
        const fy = y + 12 + i * 6;
        doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...GRAY);
        doc.text(lbl + ':', leftX + 4, fy);
        doc.setFont('helvetica','normal'); doc.setTextColor(...DARK);
        doc.text(val, leftX + 28, fy);
        if (i < clientRows.length - 1) { doc.setDrawColor(...BORDER); doc.setLineWidth(0.2); doc.line(leftX+4, fy+2, leftX+colW-4, fy+2); }
      });

      // Right box - order
      doc.setFillColor(...LGRAY); doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
      doc.roundedRect(rightX, y, colW, infoH, 1.5, 1.5, 'FD');
      doc.setFillColor(...ACCENT); doc.roundedRect(rightX, y, colW, 7, 1.5, 1.5, 'F'); doc.rect(rightX, y+4, colW, 3, 'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...WHITE);
      doc.text('INFORMACIÓN DE ORDEN', rightX + colW/2, y + 5, { align:'center' });

      const orderRows = [
        ['N° ORDEN', repair.order_number || '-'],
        ['FECHA INGRESO', repair.date || '-'],
        ['FECHA ENTREGA', repair.delivery_date || '-'],
        ['ATENDIDO POR', repair.attended_by || '-'],
        ['ABONO', repair.abono > 0 ? `$${(repair.abono||0).toLocaleString('es-CL')}` : '-'],
      ];
      orderRows.forEach(([lbl, val], i) => {
        const fy = y + 12 + i * 6;
        doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...GRAY);
        doc.text(lbl + ':', rightX + 4, fy);
        doc.setFont('helvetica','normal'); doc.setTextColor(...DARK);
        doc.text(val, rightX + 32, fy);
        if (i < orderRows.length - 1) { doc.setDrawColor(...BORDER); doc.setLineWidth(0.2); doc.line(rightX+4, fy+2, rightX+colW-4, fy+2); }
      });

      y += infoH + 6;

      // ── MACHINE INFO ──
      y = drawSectionHeader('DATOS DEL EQUIPO', y);
      const mCols = ['MARCA','MODELO','N° SERIE','TIPO'];
      const mVals = [
        machineData?.brand || repair.machine_brand || '-',
        machineData?.model || repair.machine_model || '-',
        machineData?.serial_number || repair.machine_serial || '-',
        machineData?.type || repair.machine_type || '-',
      ];
      const mW = W / mCols.length;
      // Header row - accent color
      let mx = ml;
      doc.setDrawColor(...BORDER); doc.setLineWidth(0.25);
      mCols.forEach((col) => {
        doc.setFillColor(...ACCENT);
        doc.rect(mx, y, mW, 7, 'FD');
        doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(...WHITE);
        doc.text(col, mx + mW/2, y + 4.5, { align:'center' });
        mx += mW;
      });
      y += 7;
      mx = ml;
      mVals.forEach((val) => {
        doc.setFillColor(...WHITE); doc.rect(mx, y, mW, 9, 'FD');
        doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...DARK);
        const truncated = doc.splitTextToSize(val, mW - 3)[0];
        doc.text(truncated, mx + mW/2, y + 6, { align:'center' });
        mx += mW;
      });
      y += 9 + 5;

      // ── PROBLEMA ──
      y = drawSectionHeader('DESCRIPCIÓN DEL PROBLEMA', y);
      const probH = 28;
      doc.setFillColor(...WHITE); doc.setDrawColor(...BORDER); doc.setLineWidth(0.25);
      doc.roundedRect(ml, y, W, probH, 1, 1, 'FD');
      if (repair.problem_description) {
        doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...DARK);
        const lines = doc.splitTextToSize(repair.problem_description, W - 8);
        doc.text(lines, ml + 4, y + 6);
      }
      y += probH + 5;

      // ── FINALIZADA: solution + parts + totals ──
      if (isFinalizada) {
        if (repair.solution_description) {
          y = drawSectionHeader('DESCRIPCIÓN DE LA SOLUCIÓN', y);
          const solH = 22;
          doc.setFillColor(...WHITE); doc.setDrawColor(...BORDER); doc.setLineWidth(0.25);
          doc.roundedRect(ml, y, W, solH, 1, 1, 'FD');
          doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...DARK);
          const sl = doc.splitTextToSize(repair.solution_description, W - 8);
          doc.text(sl, ml + 4, y + 6);
          y += solH + 5;
        }

        if (repair.parts_used?.length) {
          y = drawSectionHeader('REPUESTOS UTILIZADOS', y);
          const pCols = [W*0.45, W*0.15, W*0.2, W*0.2];
          let px = ml;
          // Table header
          const pHeaders = ['PRODUCTO', 'CANT.', 'PRECIO UNIT.', 'SUBTOTAL'];
          pHeaders.forEach((h, i) => {
            doc.setFillColor(...ACCENT);
            doc.rect(px, y, pCols[i], 7, 'F');
            doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...WHITE);
            doc.text(h, px + pCols[i]/2, y + 4.5, { align:'center' });
            px += pCols[i];
          });
          y += 7;
          repair.parts_used.forEach((p, ti) => {
            px = ml;
            const rowBg = ti%2===0 ? [248,250,252] : [255,255,255];
            const rowVals = [p.product_name||'-', String(p.quantity||0), `$${(p.unit_price||0).toLocaleString('es-CL')}`, `$${((p.quantity||0)*(p.unit_price||0)).toLocaleString('es-CL')}`];
            doc.setDrawColor(...BORDER); doc.setLineWidth(0.2);
            rowVals.forEach((v,i) => {
              doc.setFillColor(...rowBg);
              doc.rect(px, y, pCols[i], 7, 'FD');
              doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...DARK);
              doc.text(v, px+pCols[i]/2, y+4.5, {align:'center'});
              px += pCols[i];
            });
            y += 7;
          });
          y += 4;
        }

        // Totals
        const partsTotal = repair.parts_used?.reduce((s,p)=>s+(p.quantity||0)*(p.unit_price||0),0)||0;
        const totRows = [
          ['Subtotal repuestos', partsTotal],
          ['Mano de obra', repair.labor_cost||0],
          ['TOTAL', repair.total||0],
        ];
        if (repair.abono > 0) { totRows.push(['Abono pagado', repair.abono]); totRows.push(['Saldo pendiente', (repair.total||0)-(repair.abono||0)]); }

        const totX = mr - 70;
        totRows.forEach(([label, val]) => {
          const isTotal = label === 'TOTAL';
          const isSaldo = label === 'Saldo pendiente';
          if (isTotal) { doc.setFillColor(...ACCENT); doc.roundedRect(totX, y, 70, 8, 1, 1, 'F'); }
          else { doc.setFillColor(...LGRAY); doc.setDrawColor(...BORDER); doc.roundedRect(totX, y, 70, 7, 1, 1, 'FD'); }
          doc.setFont('helvetica', isTotal?'bold':'normal');
          doc.setFontSize(isTotal ? 9 : 8);
          doc.setTextColor(...(isTotal ? WHITE : DARK));
          doc.text(label, totX + 4, y + (isTotal?5.5:4.5));
          doc.text(`$${val.toLocaleString('es-CL')}`, mr - 4, y + (isTotal?5.5:4.5), { align:'right' });
          y += isTotal ? 10 : 9;
        });
      }

      // ── FOOTER ──
      doc.setFillColor(...ACCENT); doc.rect(0, ph-8, pw, 8, 'F');
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...WHITE);
      doc.text(settings?.company_name || '', pw/2, ph-4, { align:'center' });
      if (settings?.phone) doc.text(`Tel: ${settings.phone}`, ml, ph-4);
      if (settings?.email) doc.text(settings.email, mr, ph-4, { align:'right' });

      const filename = `orden-servicio-${repair.order_number||repair.id?.substring(0,6)}.pdf`;
      setPdfPreview({ open: true, url: getPdfBlobUrl(doc), filename });
      // Subir a Drive en segundo plano
      uploadDocToDrive(doc, filename, 'reparaciones')
        .then(() => toast.success('PDF guardado en Google Drive > Reparaciones'))
        .catch(() => {});
    } finally {
      setPrinting(false);
    }
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
              {repair.attended_by && <div className="col-span-2"><span className="text-muted-foreground">Atendido por:</span> <span className="font-medium">{repair.attended_by}</span></div>}
              {repair.abono > 0 && (
                <>
                  <div><span className="text-muted-foreground">Abono:</span> <span className="font-medium text-accent">${(repair.abono || 0).toLocaleString('es-CL')}</span></div>
                  <div><span className="text-muted-foreground">Saldo:</span> <span className={`font-bold ${(repair.total - repair.abono) <= 0 ? 'text-accent' : 'text-warning'}`}>${((repair.total || 0) - (repair.abono || 0)).toLocaleString('es-CL')}</span></div>
                </>
              )}
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

            <Button onClick={handlePrint} variant="outline" className="w-full gap-2" disabled={printing}>
              {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              {printing ? 'Generando PDF...' : 'Ver PDF'}
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