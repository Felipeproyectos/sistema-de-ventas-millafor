import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Loader2 } from 'lucide-react';
import StatusBadge from '../StatusBadge';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getPdfBlobUrl } from '../../lib/pdfUtils';
import PdfPreviewModal from '../PdfPreviewModal';

export default function RepairDetailDialog({ repair, onClose }) {
  const [settings, setSettings] = useState(null);
  const [machineData, setMachineData] = useState(null);
  const [pdfPreview, setPdfPreview] = useState({ open: false, url: null, filename: '' });
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    base44.entities.CompanySettings.list().then(s => { if (s.length) setSettings(s[0]); });
  }, []);

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
      const ml = 10, mr = pw - 10;
      const W = mr - ml;
      const isFinalizada = repair.status === 'finalizada';

      // ---- HEADER ----
      let logoBottom = 10;
      if (settings?.logo_url) {
        try {
          const img = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin='anonymous'; i.onload=()=>res(i); i.onerror=rej; i.src=settings.logo_url; });
          const c = document.createElement('canvas'); c.width=img.width; c.height=img.height;
          c.getContext('2d').drawImage(img,0,0);
          doc.addImage(c.toDataURL('image/png'),'PNG',ml,8,28,28);
          logoBottom = 38;
        } catch {}
      }

      // Company info box (top right)
      const boxX = pw - 75, boxW = 65, boxY = 8;
      doc.setDrawColor(0); doc.setLineWidth(0.5);
      doc.rect(boxX, boxY, boxW, 28);
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(30,30,30);
      const compLines = [
        `Representante legal: ${settings?.legal_rep||'-'}`,
        `RUT: ${settings?.tax_id||'-'}`,
        `Dirección: ${settings?.address||'-'}`,
        `Correo: ${settings?.email||'-'}`,
        settings?.phone ? `Teléfono: ${settings.phone}` : null,
      ].filter(Boolean);
      compLines.forEach((l, i) => doc.text(l, boxX+3, boxY+6+(i*4.5)));

      // Title
      const titleY = Math.max(logoBottom, 40) + 4;
      doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.setTextColor(30,30,30);
      doc.text('Orden de Servicio', pw/2, titleY, { align: 'center' });

      let y = titleY + 8;

      // ---- TWO COLUMN BOXES: Client | Order data ----
      const halfW = W/2 - 2;
      const leftX = ml, rightX = ml + halfW + 4;
      const boxH = 36;

      // Client box
      doc.setFillColor(240,240,240); doc.rect(leftX, y, halfW, 8, 'F');
      doc.setDrawColor(180); doc.setLineWidth(0.3); doc.rect(leftX, y, halfW, boxH);
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(30,30,30);
      doc.text('DATOS DEL CLIENTE', leftX + halfW/2, y+5.5, { align: 'center' });


      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(50,50,50);
      const clientFields = [
        ['NOMBRE:', repair.customer_name || '-'],
        ['DIRECCIÓN:', '-'],
        ['TELÉFONO:', '-'],
        ['EMAIL:', '-'],
      ];
      clientFields.forEach(([label, val], i) => {
        const fy2 = y + 13 + i * 5.5;
        doc.setFont('helvetica','bold'); doc.text(label, leftX+3, fy2);
        doc.setFont('helvetica','normal'); doc.setDrawColor(150); doc.setLineWidth(0.2);
        doc.line(leftX+22, fy2+0.5, leftX+halfW-3, fy2+0.5);
        doc.text(val, leftX+23, fy2);
      });

      // Order data box
      doc.setFillColor(240,240,240); doc.rect(rightX, y, halfW, 8, 'F');
      doc.setDrawColor(180); doc.setLineWidth(0.3); doc.rect(rightX, y, halfW, boxH);
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(30,30,30);
      doc.text('DATOS DE ORDEN DE SERVICIO', rightX + halfW/2, y+5.5, { align: 'center' });

      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(50,50,50);
      const orderFields = [
        ['No. ORDEN:', repair.order_number || repair.id?.substring(0,6) || '-'],
        ['FECHA DE INGRESO:', repair.date || '-'],
        ['FECHA DE ENTREGA:', '-'],
      ];
      orderFields.forEach(([label, val], i) => {
        const oy = y + 13 + i * 6;
        doc.setFont('helvetica','bold'); doc.text(label, rightX+3, oy);
        doc.setFont('helvetica','normal');
        doc.setDrawColor(150); doc.setLineWidth(0.2);
        doc.line(rightX + 38, oy+0.5, rightX + halfW - 3, oy+0.5);
        doc.text(val, rightX+39, oy);
      });
      // Atendido por
      const atenY = y + 13 + 3 * 6 + 2;
      doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(30,30,30);
      doc.text(`Atendido por: ${repair.attended_by || '-'}`, rightX+3, atenY);

      y += boxH + 5;

      // ---- MACHINE TABLE ----
      const machineCols = ['MARCA','MODELO','N° SERIE','TIPO MÁQUINA','ABONO (OPCIONAL)'];
      const colW = W / machineCols.length;
      doc.setFillColor(240,240,240); doc.rect(ml, y, W, 8, 'F');
      doc.setDrawColor(180); doc.setLineWidth(0.3);
      doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(30,30,30);
      let cx = ml;
      machineCols.forEach((col, i) => {
        doc.rect(cx, y, colW, 8);
        doc.text(col, cx + colW/2, y+5.5, { align: 'center' });
        cx += colW;
      });
      y += 8;

      // Machine data row
      const machineVals = [
        machineData?.brand || '-',
        machineData?.model || '-',
        machineData?.serial_number || '-',
        machineData?.type || repair.machine_name || '-',
        isFinalizada ? `$${(repair.abono||0).toLocaleString('es-CL')}` : ''
      ];
      cx = ml;
      machineVals.forEach((val, i) => {
        doc.rect(cx, y, colW, 10);
        doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(50,50,50);
        doc.text(val, cx + colW/2, y+6, { align: 'center' });
        cx += colW;
      });
      y += 10 + 5;

      // ---- DESCRIPCIÓN DE LA FALLA ----
      doc.setFillColor(240,240,240); doc.rect(ml, y, W, 8, 'F');
      doc.setDrawColor(180); doc.setLineWidth(0.3); doc.rect(ml, y, W, 8);
      doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(30,30,30);
      doc.text('DESCRIPCIÓN DE LA FALLA', pw/2, y+5.5, { align: 'center' });
      y += 8;
      const descH = 32;
      doc.rect(ml, y, W, descH);
      if (repair.problem_description) {
        doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(50,50,50);
        const lines = doc.splitTextToSize(repair.problem_description, W-6);
        doc.text(lines, ml+3, y+6);
      }
      y += descH + 5;

      // ---- ONLY IF FINALIZADA: solution + parts + totals ----
      if (isFinalizada) {
        // Solution
        if (repair.solution_description) {
          doc.setFillColor(240,240,240); doc.rect(ml, y, W, 8, 'F');
          doc.rect(ml, y, W, 8);
          doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(30,30,30);
          doc.text('DESCRIPCIÓN DE LA SOLUCIÓN', pw/2, y+5.5, { align: 'center' });
          y += 8;
          const solH = 24;
          doc.rect(ml, y, W, solH);
          doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(50,50,50);
          const sl = doc.splitTextToSize(repair.solution_description, W-6);
          doc.text(sl, ml+3, y+6);
          y += solH + 5;
        }

        // Parts table
        if (repair.parts_used?.length) {
          doc.setFillColor(240,240,240); doc.rect(ml, y, W, 8, 'F');
          doc.rect(ml, y, W, 8);
          doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(30,30,30);
          doc.text('REPUESTOS UTILIZADOS', pw/2, y+5.5, { align: 'center' });
          y += 8;
          const pCols = [W*0.5, W*0.15, W*0.2, W*0.15];
          const pHeaders = ['DESCRIPCIÓN','CANT.','PRECIO UNIT.','TOTAL'];
          let px = ml;
          doc.setFontSize(7.5);
          pHeaders.forEach((h, i) => {
            doc.rect(px, y, pCols[i], 7);
            doc.text(h, px+pCols[i]/2, y+4.5, { align: 'center' });
            px += pCols[i];
          });
          y += 7;
          repair.parts_used.forEach((p) => {
            px = ml;
            const rowVals = [
              p.product_name||'-',
              String(p.quantity||0),
              `$${(p.unit_price||0).toLocaleString('es-CL')}`,
              `$${((p.quantity||0)*(p.unit_price||0)).toLocaleString('es-CL')}`
            ];
            rowVals.forEach((v, i) => {
              doc.rect(px, y, pCols[i], 7);
              doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(50,50,50);
              doc.text(v, px+pCols[i]/2, y+4.5, { align: 'center' });
              px += pCols[i];
            });
            y += 7;
          });
          y += 4;
        }

        // Totals
        const partsTotal = repair.parts_used?.reduce((s,p)=>s+(p.quantity||0)*(p.unit_price||0),0)||0;
        const totRows = [
          ['Repuestos:', partsTotal],
          ['Mano de obra:', repair.labor_cost||0],
          ['Total:', repair.total||0],
        ];
        if (repair.abono > 0) {
          totRows.push(['Abono:', repair.abono]);
          totRows.push(['Saldo:', (repair.total||0)-(repair.abono||0)]);
        }
        const totX = mr - 70;
        totRows.forEach(([label, val], i) => {
          const isTotal = label === 'Total:';
          if (isTotal) { doc.setFillColor(220,220,220); doc.rect(totX, y, 70, 7, 'F'); }
          doc.setFont('helvetica', isTotal?'bold':'normal'); doc.setFontSize(8.5); doc.setTextColor(30,30,30);
          doc.text(label, totX+3, y+5);
          doc.text(`$${val.toLocaleString('es-CL')}`, mr-3, y+5, { align: 'right' });
          doc.setDrawColor(180); doc.rect(totX, y, 70, 7);
          y += 7;
        });
      }

      const filename = `orden-servicio-${repair.order_number||repair.id?.substring(0,6)}.pdf`;
      setPdfPreview({ open: true, url: getPdfBlobUrl(doc), filename });
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