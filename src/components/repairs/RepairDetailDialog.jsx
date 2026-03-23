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
  const [pdfPreview, setPdfPreview] = useState({ open: false, url: null, filename: '' });
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    base44.entities.CompanySettings.list().then(s => { if (s.length) setSettings(s[0]); });
  }, []);

  if (!repair) return null;

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();

      const hexToRgb = (hex) => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
      const ACCENT = settings?.accent_color ? hexToRgb(settings.accent_color) : [214, 90, 30];
      const DARK = [30,30,30], GRAY = [110,110,110], WHITE = [255,255,255], LGRAY = [245,245,245];
      const ml = 14, mr = pw - 14;

      // Top bar
      doc.setFillColor(...ACCENT); doc.rect(0, 0, pw, 3, 'F');

      // Logo
      let headerBottom = 14;
      if (settings?.logo_url) {
        try {
          const img = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin='anonymous'; i.onload=()=>res(i); i.onerror=rej; i.src=settings.logo_url; });
          const c = document.createElement('canvas'); c.width=img.width; c.height=img.height;
          c.getContext('2d').drawImage(img,0,0);
          doc.addImage(c.toDataURL('image/png'),'PNG',ml,6,24,24);
          headerBottom = 32;
        } catch {}
      }
      const nameX = settings?.logo_url ? ml+27 : ml;
      doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.setTextColor(...DARK);
      doc.text((settings?.company_name||'EMPRESA').toUpperCase(), nameX, 16);
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...GRAY);
      if (settings?.address) doc.text(settings.address, nameX, 21);
      if (settings?.phone)   doc.text(settings.phone,   nameX, 26);
      if (settings?.email)   doc.text(settings.email,   nameX, 31);

      // Title box
      doc.setFillColor(...LGRAY); doc.roundedRect(pw-58,5,46,28,2,2,'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(...DARK);
      doc.text('ORDEN DE', pw-35, 14, {align:'center'});
      doc.text('REPARACIÓN', pw-35, 20, {align:'center'});
      doc.setFontSize(9); doc.setTextColor(...ACCENT);
      doc.text(`N° ${repair.order_number||repair.id?.substring(0,6)}`, pw-35, 27, {align:'center'});
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...GRAY);
      doc.text(`Fecha: ${repair.date||'-'}`, pw-35, 32, {align:'center'});

      // Divider
      let y = Math.max(headerBottom, 36);
      doc.setDrawColor(...ACCENT); doc.setLineWidth(0.8); doc.line(ml,y,mr,y); y+=7;

      // Client / machine info
      doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...DARK);
      doc.text((repair.customer_name||'-').toUpperCase(), ml, y); y+=5;
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY);
      if (repair.machine_name) { doc.text(`Equipo: ${repair.machine_name}`, ml, y); y+=5; }
      const statusLabel = {pendiente:'Pendiente',en_proceso:'En Proceso',finalizada:'Finalizada'}[repair.status]||repair.status;
      doc.text(`Estado: ${statusLabel}`, ml, y); y+=8;

      // Problem / solution
      if (repair.problem_description) {
        doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...DARK);
        doc.text('PROBLEMA:', ml, y); y+=5;
        doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY);
        const pl = doc.splitTextToSize(repair.problem_description, mr-ml); doc.text(pl,ml,y); y+=pl.length*4.5+4;
      }
      if (repair.solution_description) {
        doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...DARK);
        doc.text('SOLUCIÓN:', ml, y); y+=5;
        doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY);
        const sl = doc.splitTextToSize(repair.solution_description, mr-ml); doc.text(sl,ml,y); y+=sl.length*4.5+4;
      }

      // Parts table
      if (repair.parts_used?.length) {
        const COL = {d:ml,q:112,u:140,t:170}; const ROW_H=8;
        doc.setFillColor(...ACCENT); doc.rect(ml,y,mr-ml,ROW_H,'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...WHITE);
        doc.text('REPUESTO',COL.d+2,y+5.5); doc.text('CANT',COL.q,y+5.5);
        doc.text('PRECIO UNIT.',COL.u,y+5.5); doc.text('TOTAL',COL.t,y+5.5); y+=ROW_H;
        doc.setFont('helvetica','normal'); doc.setFontSize(9);
        repair.parts_used.forEach((p,i) => {
          const rh=ROW_H;
          if (i%2===1) { doc.setFillColor(...LGRAY); doc.rect(ml,y,mr-ml,rh,'F'); }
          doc.setTextColor(...DARK);
          doc.text(p.product_name||'-', COL.d+2, y+5.5);
          doc.text(String(p.quantity||0), COL.q, y+5.5);
          doc.text(`$ ${(p.unit_price||0).toLocaleString('es-CL')}`, COL.u, y+5.5);
          doc.text(`$ ${((p.quantity||0)*(p.unit_price||0)).toLocaleString('es-CL')}`, COL.t, y+5.5);
          y+=rh;
        });
      }

      // Divider
      doc.setDrawColor(...ACCENT); doc.setLineWidth(0.6); doc.line(ml,y,mr,y); y+=8;

      // Totals
      const totalsX=125; const tRight=mr; let ty=y;
      const drawRow = (label, value) => {
        doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...GRAY);
        doc.text(label, totalsX+2, ty);
        doc.text(`$ ${value.toLocaleString('es-CL')}`, tRight, ty, {align:'right'});
        ty+=7;
      };
      drawRow('REPUESTOS:', repair.parts_used?.reduce((s,p)=>s+(p.quantity||0)*(p.unit_price||0),0)||0);
      if ((repair.labor_cost||0)>0) drawRow('MANO DE OBRA:', repair.labor_cost||0);
      doc.setFillColor(...ACCENT); doc.rect(totalsX, ty-5, mr-totalsX, 9, 'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(10.5); doc.setTextColor(...WHITE);
      doc.text('TOTAL:', totalsX+2, ty);
      doc.text(`$ ${(repair.total||0).toLocaleString('es-CL')}`, tRight, ty, {align:'right'}); ty+=9;
      if ((repair.abono||0)>0) {
        doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...GRAY);
        doc.text(`Abono: $ ${(repair.abono||0).toLocaleString('es-CL')}`, totalsX+2, ty);
        const saldo=(repair.total||0)-(repair.abono||0);
        doc.setFont('helvetica','bold'); doc.setTextColor(...ACCENT);
        doc.text(`Saldo: $ ${saldo.toLocaleString('es-CL')}`, tRight, ty, {align:'right'});
      }

      // Footer
      const fy=ph-20;
      doc.setDrawColor(...ACCENT); doc.setLineWidth(0.4); doc.line(ml,fy-3,mr,fy-3);
      const fCols=[ml, ml+(mr-ml)/3, ml+(mr-ml)*2/3];
      const fData=[['UBICACIÓN',settings?.address||'-'],['TELÉFONO / EMAIL',[settings?.phone,settings?.email].filter(Boolean).join('  |  ')||'-'],['RUT / NIT',settings?.tax_id||'-']];
      fData.forEach(([label,val],i)=>{
        doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...DARK); doc.text(label,fCols[i],fy+2);
        doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...GRAY);
        doc.text(doc.splitTextToSize(val,55),fCols[i],fy+7);
      });
      doc.setFillColor(...ACCENT); doc.rect(0,ph-4,pw,4,'F');

      const filename = `reparacion-${repair.order_number||repair.id?.substring(0,6)}.pdf`;
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