import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from '../components/PageHeader';
import PdfPreviewModal from '../components/PdfPreviewModal';
import { getPdfBlobUrl } from '../lib/pdfUtils';
import { FileText, Loader2, Pen, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const defaultForm = {
  order_number: '1',
  date: new Date().toISOString().split('T')[0],
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  machine_brand: '',
  machine_model: '',
  invoice_number: '',
  seller_company: 'MILLAFOR',
  observations_1: 'Se realizó una inspección exhaustiva de todos los componentes del equipo, confirmando que estaban en perfecto estado.',
  observations_2: '',
  security_title: 'Recomendaciones de Seguridad:',
  security_epp: 'Equipo de Protección Personal (EPP): Siempre utilizar casco, guantes, gafas de seguridad y protección auditiva al operar motosierra o desbrozadora.',
  maintenance: 'Realizar el mantenimiento periódico según las recomendaciones del fabricante (reemplazo de filtros, lubricación, afilado de cadena, etc.).',
  responsible_name: '',
};

export default function Warranty() {
  const [form, setForm] = useState(defaultForm);
  const [settings, setSettings] = useState(null);
  const [signatureImg, setSignatureImg] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [pdfPreview, setPdfPreview] = useState({ open: false, url: null });
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef(null);
  const lastPos = useRef(null);
  const signatureFileRef = useRef(null);

  useEffect(() => {
    base44.entities.CompanySettings.list().then(s => {
      if (s.length) {
        setSettings(s[0]);
        setForm(f => ({
          ...f,
          seller_company: s[0].company_name || 'MILLAFOR',
          responsible_name: s[0].legal_rep || '',
        }));
      }
    });
  }, []);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  // Canvas drawing
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    lastPos.current = getPos(e, canvasRef.current);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => {
    setIsDrawing(false);
    setSignatureImg(canvasRef.current.toDataURL('image/png'));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setSignatureImg(null);
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setSignatureImg(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const ml = 14, mr = pw - 14;

      // Color palette
      const DARK = [15, 23, 42];
      const ACCENT = settings?.accent_color
        ? [parseInt(settings.accent_color.slice(1,3),16), parseInt(settings.accent_color.slice(3,5),16), parseInt(settings.accent_color.slice(5,7),16)]
        : [30, 58, 95];
      const MID = [51, 65, 85];
      const LGRAY = [241, 245, 249];
      const BORDER = [203, 213, 225];
      const WHITE = [255, 255, 255];

      // Top accent bar
      doc.setFillColor(...ACCENT);
      doc.rect(0, 0, pw, 4, 'F');

      // ── HEADER ──
      // Left: company info
      let logoBottom = 8;
      if (settings?.logo_url) {
        try {
          const img = await new Promise((res, rej) => {
            const i = new Image(); i.crossOrigin = 'anonymous';
            i.onload = () => res(i); i.onerror = rej; i.src = settings.logo_url;
          });
          const c = document.createElement('canvas');
          c.width = img.width; c.height = img.height;
          c.getContext('2d').drawImage(img, 0, 0);
          doc.addImage(c.toDataURL('image/png'), 'PNG', ml, 8, 32, 22);
          logoBottom = 32;
        } catch {}
      }

      // Company info (left)
      let cy = 10;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...ACCENT);
      doc.text((settings?.company_name || 'EMPRESA').toUpperCase(), mr - 2, cy, { align: 'right' });
      cy += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MID);
      if (settings?.legal_rep) { doc.text(`Rep. Legal: ${settings.legal_rep}`, mr - 2, cy, { align: 'right' }); cy += 4; }
      if (settings?.tax_id)    { doc.text(`RUT: ${settings.tax_id}`, mr - 2, cy, { align: 'right' }); cy += 4; }
      if (settings?.phone)     { doc.text(`Tel: ${settings.phone}`, mr - 2, cy, { align: 'right' }); cy += 4; }
      if (settings?.email)     { doc.text(settings.email, mr - 2, cy, { align: 'right' }); cy += 4; }
      if (settings?.address)   { doc.text(settings.address, mr - 2, cy, { align: 'right' }); cy += 4; }

      let y = Math.max(logoBottom, cy) + 6;

      // Divider
      doc.setDrawColor(...ACCENT); doc.setLineWidth(0.8);
      doc.line(ml, y, mr, y); y += 6;

      // Title
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...DARK);
      doc.text('ORDEN DE PUESTA EN MARCHA', pw / 2, y, { align: 'center' });
      doc.setFontSize(10); doc.setTextColor(...ACCENT);
      doc.text(`N° ${form.order_number}`, mr, y, { align: 'right' });
      y += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MID);
      doc.text(`FECHA: ${form.date}`, mr, y, { align: 'right' });
      y += 8;

      // ── CLIENT DATA TABLE ──
      const tblData = [
        ['NOMBRE DEL CLIENTE', form.customer_name],
        ['TELÉFONO', form.customer_phone],
        ['CORREO ELECTRÓNICO', form.customer_email],
        ['MARCA', form.machine_brand],
        ['MODELO', form.machine_model],
        ['N° FACTURA O BOLETA', form.invoice_number],
        ['EMPRESA VENDEDORA', form.seller_company],
      ];
      const col1 = 60, col2 = mr - ml - col1;
      tblData.forEach((row, i) => {
        const ry = y + i * 9;
        // Alternating rows
        if (i % 2 === 0) { doc.setFillColor(...LGRAY); } else { doc.setFillColor(...WHITE); }
        doc.setDrawColor(...BORDER); doc.setLineWidth(0.25);
        doc.rect(ml, ry, col1, 9, 'FD');
        doc.rect(ml + col1, ry, col2, 9, 'FD');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...DARK);
        doc.text(row[0], ml + 3, ry + 6);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...MID);
        doc.text(row[1] || '', ml + col1 + 3, ry + 6);
      });
      y += tblData.length * 9 + 6;

      // ── OBSERVATIONS ──
      const drawSectionHeader = (title, yy) => {
        doc.setFillColor(...ACCENT);
        doc.rect(ml, yy, mr - ml, 8, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...WHITE);
        doc.text(title, pw / 2, yy + 5.5, { align: 'center' });
        return yy + 8;
      };

      y = drawSectionHeader('Observaciones de Puesta en Marcha', y);

      const drawTextBox = (text, yy, minH = 18) => {
        if (!text) return yy + minH;
        const lines = doc.splitTextToSize(text, mr - ml - 8);
        const h = Math.max(minH, lines.length * 5 + 6);
        doc.setFillColor(...WHITE); doc.setDrawColor(...BORDER); doc.setLineWidth(0.25);
        doc.rect(ml, yy, mr - ml, h, 'FD');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...DARK);
        doc.text(lines, pw / 2, yy + 6, { align: 'center' });
        return yy + h + 3;
      };

      y = drawTextBox(form.observations_1, y);
      if (form.observations_2) y = drawTextBox(form.observations_2, y);
      y += 3;

      // ── SECURITY RECOMMENDATIONS ──
      y = drawSectionHeader('Recomendaciones de Seguridad:', y);
      const secRows = [
        ['Recomendaciones de Seguridad:', form.security_epp],
        ['Mantenimiento regular:', form.maintenance],
      ];
      secRows.forEach(([label, val]) => {
        const lines = doc.splitTextToSize(val, (mr - ml) * 0.65 - 4);
        const h = Math.max(18, lines.length * 5 + 8);
        doc.setFillColor(...WHITE); doc.setDrawColor(...BORDER); doc.setLineWidth(0.25);
        const lw = (mr - ml) * 0.32;
        const rw = (mr - ml) - lw;
        doc.rect(ml, y, lw, h, 'FD');
        doc.rect(ml + lw, y, rw, h, 'FD');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...DARK);
        const lblLines = doc.splitTextToSize(label, lw - 4);
        doc.text(lblLines, ml + 4, y + 6);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...MID);
        doc.text(lines, ml + lw + 4, y + 6);
        y += h;
      });
      y += 10;

      // ── SIGNATURE ──
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...DARK);
      doc.text('Firmas:', ml, y); y += 4;
      doc.setDrawColor(...ACCENT); doc.setLineWidth(0.5);
      doc.line(ml, y + 14, ml + 60, y + 14);
      if (signatureImg) {
        try {
          doc.addImage(signatureImg, 'PNG', ml, y, 60, 14);
        } catch {}
      }
      y += 16;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...DARK);
      doc.text('Responsable de la Puesta en Marcha:', ml, y); y += 5;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...MID);
      doc.text(form.responsible_name || settings?.legal_rep || '', ml, y);

      // Footer bar
      doc.setFillColor(...ACCENT); doc.rect(0, ph - 8, pw, 8, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...WHITE);
      doc.text(settings?.company_name || '', pw / 2, ph - 3.5, { align: 'center' });
      if (settings?.phone) doc.text(`Tel: ${settings.phone}`, ml, ph - 3.5);
      if (settings?.email) doc.text(settings.email, mr, ph - 3.5, { align: 'right' });

      const filename = `orden-puesta-marcha-${form.order_number}.pdf`;
      setPdfPreview({ open: true, url: getPdfBlobUrl(doc), filename });
    } catch (err) {
      toast.error('Error al generar PDF: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const fields = [
    { label: 'N° Orden', key: 'order_number' },
    { label: 'Fecha', key: 'date', type: 'date' },
    { label: 'Nombre del Cliente', key: 'customer_name' },
    { label: 'Teléfono', key: 'customer_phone' },
    { label: 'Correo Electrónico', key: 'customer_email' },
    { label: 'Marca', key: 'machine_brand' },
    { label: 'Modelo', key: 'machine_model' },
    { label: 'N° Factura o Boleta', key: 'invoice_number' },
    { label: 'Empresa Vendedora', key: 'seller_company' },
    { label: 'Responsable de la Puesta en Marcha', key: 'responsible_name' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Garantía / Puesta en Marcha" description="Genera y descarga órdenes de puesta en marcha">
        <Button onClick={handleGeneratePdf} disabled={generating} className="gap-2">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {generating ? 'Generando...' : 'Generar PDF'}
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: form fields */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Datos de la Orden</h3>
            <div className="grid grid-cols-2 gap-3">
              {fields.map(f => (
                <div key={f.key} className={f.key === 'responsible_name' || f.key === 'customer_name' ? 'col-span-2' : ''}>
                  <Label className="text-xs">{f.label}</Label>
                  <Input
                    type={f.type || 'text'}
                    value={form[f.key]}
                    onChange={e => set(f.key, e.target.value)}
                    className="bg-secondary border-border h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Observaciones</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Observación principal</Label>
                <Textarea value={form.observations_1} onChange={e => set('observations_1', e.target.value)} className="bg-secondary border-border text-sm" rows={3} />
              </div>
              <div>
                <Label className="text-xs">Observación secundaria (opcional)</Label>
                <Textarea value={form.observations_2} onChange={e => set('observations_2', e.target.value)} className="bg-secondary border-border text-sm" rows={2} placeholder="Ej: Se realizó puesta en marcha de Motosierra..." />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Recomendaciones de Seguridad</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">EPP / Seguridad</Label>
                <Textarea value={form.security_epp} onChange={e => set('security_epp', e.target.value)} className="bg-secondary border-border text-sm" rows={3} />
              </div>
              <div>
                <Label className="text-xs">Mantenimiento regular</Label>
                <Textarea value={form.maintenance} onChange={e => set('maintenance', e.target.value)} className="bg-secondary border-border text-sm" rows={3} />
              </div>
            </div>
          </div>
        </div>

        {/* Right column: signature + preview info */}
        <div className="space-y-4">
          {settings && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Datos de la Empresa (desde Configuración)</h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Empresa:</span> <span className="font-medium">{settings.company_name}</span></p>
                {settings.legal_rep && <p><span className="text-muted-foreground">Rep. Legal:</span> <span className="font-medium">{settings.legal_rep}</span></p>}
                {settings.tax_id && <p><span className="text-muted-foreground">RUT:</span> <span className="font-medium">{settings.tax_id}</span></p>}
                {settings.phone && <p><span className="text-muted-foreground">Tel:</span> <span className="font-medium">{settings.phone}</span></p>}
                {settings.email && <p><span className="text-muted-foreground">Email:</span> <span className="font-medium">{settings.email}</span></p>}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Para modificar estos datos ve a <strong>Configuración</strong>.</p>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Firma Digital</h3>
              <div className="flex gap-2">
                <Button
                  variant={drawMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDrawMode(!drawMode)}
                  className="gap-1 text-xs h-7"
                >
                  <Pen className="h-3 w-3" /> {drawMode ? 'Modo dibujo activo' : 'Dibujar firma'}
                </Button>
                <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => signatureFileRef.current?.click()}>
                  <Upload className="h-3 w-3" /> Subir imagen
                </Button>
                {signatureImg && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 text-destructive p-0" onClick={clearCanvas}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <input ref={signatureFileRef} type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />

            <div className={`relative border-2 rounded-lg overflow-hidden ${drawMode ? 'border-primary cursor-crosshair' : 'border-border'}`}>
              <canvas
                ref={canvasRef}
                width={520}
                height={120}
                className="w-full bg-white"
                onMouseDown={drawMode ? startDraw : undefined}
                onMouseMove={drawMode ? draw : undefined}
                onMouseUp={drawMode ? endDraw : undefined}
                onMouseLeave={drawMode ? endDraw : undefined}
                onTouchStart={drawMode ? startDraw : undefined}
                onTouchMove={drawMode ? draw : undefined}
                onTouchEnd={drawMode ? endDraw : undefined}
              />
              {!drawMode && !signatureImg && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-xs text-muted-foreground">Activa el modo dibujo o sube una imagen de firma</p>
                </div>
              )}
            </div>
            {drawMode && <p className="text-xs text-muted-foreground mt-2">Dibuja tu firma en el área blanca y luego desactiva el modo dibujo.</p>}
          </div>

          <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 text-sm text-accent">
            <p className="font-semibold mb-1">💡 Tip</p>
            <p className="text-xs">Completa todos los campos y agrega la firma digital antes de generar el PDF. El documento incluirá el logo y datos de la empresa automáticamente.</p>
          </div>
        </div>
      </div>

      <PdfPreviewModal
        open={pdfPreview.open}
        onOpenChange={open => setPdfPreview(p => ({ ...p, open }))}
        blobUrl={pdfPreview.url}
        filename={pdfPreview.filename || 'orden-puesta-marcha.pdf'}
      />
    </div>
  );
}