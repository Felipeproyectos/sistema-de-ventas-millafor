import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from '../components/PageHeader';
import PdfPreviewModal from '../components/PdfPreviewModal';
import { getPdfBlobUrl } from '../lib/pdfUtils';
import { uploadDocToDrive } from '../lib/driveUpload';
import { FileText, Loader2, Pen, Upload, Trash2, Search, History, PlusCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const SIG_KEY_RESPONSIBLE = 'warranty_sig_responsible';
const SIG_KEY_CLIENT      = 'warranty_sig_client';

const genOrderNumber = (type = 'puesta_en_marcha') => {
  const now = new Date();
  const yy  = String(now.getFullYear()).slice(2);
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  const dd  = String(now.getDate()).padStart(2, '0');
  const seq = String(now.getHours() * 60 + now.getMinutes()).padStart(4, '0');
  const prefix = type === 'garantia' ? 'OG' : 'OPM';
  return `${prefix}-${yy}${mm}${dd}-${seq}`;
};

const defaultForm = () => ({
  doc_type: 'puesta_en_marcha',
  order_number: genOrderNumber('puesta_en_marcha'),
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
  security_epp: 'Equipo de Protección Personal (EPP): Siempre utilizar casco, guantes, gafas de seguridad y protección auditiva al operar motosierra o desbrozadora.',
  maintenance: 'Realizar el mantenimiento periódico según las recomendaciones del fabricante (reemplazo de filtros, lubricación, afilado de cadena, etc.).',
  responsible_name: '',
  authorized_service: 'SERVICIO AUTORIZADO STIHL',
});

// ── Signature Pad ──────────────────────────────────────
function SignaturePad({ label, storageKey }) {
  const canvasRef = useRef(null);
  const fileRef   = useRef(null);
  const lastPos   = useRef(null);
  const [drawMode, setDrawMode]   = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSig, setHasSig]       = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
        setHasSig(true);
      };
      img.src = saved;
    }
  }, [storageKey]);

  const save = () => {
    const data = canvasRef.current.toDataURL('image/png');
    localStorage.setItem(storageKey, data);
    setHasSig(true);
    toast.success('Firma guardada');
  };

  const clear = () => {
    canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    localStorage.removeItem(storageKey);
    setHasSig(false);
    setDrawMode(false);
  };

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * (canvas.width / rect.width), y: (src.clientY - rect.top) * (canvas.height / rect.height) };
  };

  const startDraw = (e) => { e.preventDefault(); setIsDrawing(true); lastPos.current = getPos(e, canvasRef.current); };
  const draw = (e) => {
    if (!isDrawing) return; e.preventDefault();
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.strokeStyle = '#0a0f1e'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
    lastPos.current = pos;
  };
  const endDraw = () => { setIsDrawing(false); };

  const handleUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasSig(true);
        localStorage.setItem(storageKey, canvas.toDataURL('image/png'));
        toast.success('Firma cargada y guardada');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</h4>
          {hasSig && <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle className="h-3 w-3" /> Guardada</span>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant={drawMode ? 'default' : 'outline'} size="sm" onClick={() => setDrawMode(v => !v)} className="gap-1 text-xs h-7">
            <Pen className="h-3 w-3" /> {drawMode ? 'Dibujando' : 'Dibujar'}
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3 w-3" /> Subir
          </Button>
          {drawMode && (
            <Button variant="secondary" size="sm" className="gap-1 text-xs h-7" onClick={save}>
              <CheckCircle className="h-3 w-3" /> Guardar firma
            </Button>
          )}
          {hasSig && (
            <Button variant="ghost" size="sm" className="h-7 w-7 text-destructive p-0" onClick={clear} title="Eliminar firma">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      <div className={`relative border-2 rounded-lg overflow-hidden transition-colors ${drawMode ? 'border-primary cursor-crosshair' : 'border-border'}`}>
        <canvas
          ref={canvasRef} width={600} height={120} className="w-full bg-white"
          onMouseDown={drawMode ? startDraw : undefined} onMouseMove={drawMode ? draw : undefined}
          onMouseUp={drawMode ? endDraw : undefined} onMouseLeave={drawMode ? endDraw : undefined}
          onTouchStart={drawMode ? startDraw : undefined} onTouchMove={drawMode ? draw : undefined} onTouchEnd={drawMode ? endDraw : undefined}
        />
        {!hasSig && !drawMode && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs text-muted-foreground">Dibuja o sube una imagen — se guardará automáticamente</p>
          </div>
        )}
      </div>
      {hasSig && !drawMode && <p className="text-xs text-green-400 mt-2">✓ Esta firma se usará en el PDF.</p>}
    </div>
  );
}

// ── History Tab ────────────────────────────────────────
function HistoryTab({ settings }) {
  const [orders, setOrders]   = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [pdfPreview, setPdfPreview] = useState({ open: false, url: null, filename: '' });

  useEffect(() => {
    base44.entities.WarrantyOrder.list('-created_date', 100).then(data => { setOrders(data); setLoading(false); });
  }, []);

  const filtered = orders.filter(o =>
    o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.order_number?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRegenerate = async (order) => {
    const doc = await buildPdf(order, settings, null, null);
    if (doc) setPdfPreview({ open: true, url: getPdfBlobUrl(doc), filename: `orden-${order.order_number}.pdf` });
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta orden del historial?')) return;
    await base44.entities.WarrantyOrder.delete(id);
    setOrders(prev => prev.filter(o => o.id !== id));
    toast.success('Orden eliminada');
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por cliente, factura o N° orden..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>{search ? 'Sin resultados para tu búsqueda.' : 'Aún no hay órdenes generadas.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => (
            <div key={o.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">N° {o.order_number || '—'}</span>
                  <span className="text-xs text-muted-foreground">{o.date}</span>
                </div>
                <p className="font-semibold text-sm truncate">{o.customer_name}</p>
                <div className="flex gap-4 mt-1">
                  {o.machine_brand && <span className="text-xs text-muted-foreground">Marca: {o.machine_brand}</span>}
                  {o.machine_model && <span className="text-xs text-muted-foreground">Modelo: {o.machine_model}</span>}
                  {o.invoice_number && <span className="text-xs text-muted-foreground">Boleta/Factura: {o.invoice_number}</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleRegenerate(o)}>
                  <FileText className="h-3.5 w-3.5" /> Ver PDF
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(o.id)} title="Eliminar">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <PdfPreviewModal open={pdfPreview.open} onOpenChange={open => setPdfPreview(p => ({ ...p, open }))} blobUrl={pdfPreview.url} filename={pdfPreview.filename} />
    </div>
  );
}

// ── PDF builder ────────────────────────────────────────
async function buildPdf(form, settings, responsibleSigData, clientSigData) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 15, mr = pw - 15;
  const W  = mr - ml;

  // Footer height reserved at bottom
  const FOOTER_H = 20;
  // Badge placed just above footer
  const BADGE_H  = 13;
  const BADGE_Y  = ph - FOOTER_H - BADGE_H - 4;

  // ── HEADER BAND ──
  doc.setFillColor(8, 18, 40);   doc.rect(0, 0, pw, 44, 'F');
  doc.setFillColor(18, 45, 90);  doc.rect(0, 38, pw, 6, 'F');
  doc.setFillColor(30, 70, 140); doc.rect(0, 42, pw, 2.5, 'F');

  // Company info — left side (name + Rep. Legal + RUT + Tel + Email)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
  doc.text((settings?.company_name || 'EMPRESA').toUpperCase(), ml, 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(160, 190, 240);
  let hY = 19;
  if (settings?.legal_rep) { doc.text(`Rep. Legal: ${settings.legal_rep}`, ml, hY); hY += 4; }
  if (settings?.tax_id)    { doc.text(`RUT: ${settings.tax_id}`, ml, hY); hY += 4; }
  if (settings?.phone)     { doc.text(`Tel: ${settings.phone}`, ml, hY); hY += 4; }
  if (settings?.email)     { doc.text(`Email: ${settings.email}`, ml, hY); }

  // Logo — right side
  const logoSize = 28;
  const logoX = mr - logoSize;
  if (settings?.logo_url) {
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image(); i.crossOrigin = 'anonymous';
        i.onload = () => res(i); i.onerror = rej; i.src = settings.logo_url;
      });
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(logoX - 3, 5, logoSize + 6, logoSize + 6, 3, 3, 'F');
      doc.addImage(c.toDataURL('image/png'), 'PNG', logoX, 8, logoSize, logoSize);
    } catch {}
  }

  // ── TITLE BAR ──
  let y = 52;
  doc.setFillColor(235, 240, 252); doc.rect(ml, y, W, 13, 'F');
  doc.setFillColor(30, 70, 140);   doc.rect(ml, y, 4, 13, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(8, 18, 40);
  const docTitle = form.doc_type === 'garantia' ? 'ORDEN DE GARANTÍA' : 'ORDEN DE PUESTA EN MARCHA';
  doc.text(docTitle, ml + 9, y + 9);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30, 70, 140);
  doc.text(`N° ${form.order_number || '—'}`, mr, y + 5.5, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 100, 140);
  doc.text(`Fecha: ${form.date}`, mr, y + 10.5, { align: 'right' });
  y += 19;

  // ── SECTION TITLE HELPER ──
  const drawSectionTitle = (title, yy) => {
    doc.setFillColor(8, 18, 40); doc.rect(ml, yy, W, 8, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(160, 195, 255);
    doc.text(('— ' + title + ' —').toUpperCase(), pw / 2, yy + 5.5, { align: 'center' });
    return yy + 8;
  };

  // ── CLIENT TABLE ──
  y = drawSectionTitle('Datos del Cliente y Equipo', y);
  const clientRows = [
    ['Nombre del Cliente',  form.customer_name  || ''],
    ['Teléfono',            form.customer_phone || ''],
    ['Correo Electrónico',  form.customer_email || ''],
    ['Marca del Equipo',    form.machine_brand  || ''],
    ['Modelo',              form.machine_model  || ''],
    ['N° Factura / Boleta', form.invoice_number || ''],
    ['Empresa Vendedora',   form.seller_company || ''],
  ];
  const colL = 62;
  clientRows.forEach((row, i) => {
    const ry = y + i * 8;
    doc.setFillColor(i % 2 === 0 ? 245 : 255, i % 2 === 0 ? 247 : 255, i % 2 === 0 ? 252 : 255);
    doc.setDrawColor(200, 212, 235); doc.setLineWidth(0.2);
    doc.rect(ml, ry, colL, 8, 'FD');
    doc.rect(ml + colL, ry, W - colL, 8, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(60, 80, 120);
    doc.text(row[0], ml + 3, ry + 5.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(8, 18, 40);
    doc.text(row[1], ml + colL + 4, ry + 5.5);
  });
  y += clientRows.length * 8 + 6;

  // ── OBSERVATIONS ──
  const obsTitle = form.doc_type === 'garantia' ? 'Observaciones de Garantía' : 'Observaciones de Puesta en Marcha';
  y = drawSectionTitle(obsTitle, y);
  const drawTextBox = (text, yy) => {
    if (!text) return yy;
    const lines = doc.splitTextToSize(text, W - 10);
    const h = Math.max(13, lines.length * 5 + 7);
    doc.setFillColor(250, 252, 255); doc.setDrawColor(200, 212, 235); doc.setLineWidth(0.2);
    doc.rect(ml, yy, W, h, 'FD');
    doc.setFillColor(30, 70, 140); doc.rect(ml, yy, 2.5, h, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(15, 25, 55);
    doc.text(lines, ml + 7, yy + 6);
    return yy + h + 3;
  };
  y = drawTextBox(form.observations_1, y);
  if (form.observations_2) y = drawTextBox(form.observations_2, y);
  y += 3;

  // ── SECURITY ──
  y = drawSectionTitle('Recomendaciones de Seguridad', y);
  const secRows = [
    ['Recomendaciones de Seguridad (EPP):', form.security_epp || ''],
    ['Mantenimiento Regular:',              form.maintenance  || ''],
  ];
  secRows.forEach(([lbl, val]) => {
    const lw = W * 0.32; const rw = W - lw;
    const valLines = doc.splitTextToSize(val, rw - 6);
    const lblLines = doc.splitTextToSize(lbl, lw - 6);
    const h = Math.max(17, Math.max(valLines.length, lblLines.length) * 5 + 9);
    doc.setFillColor(235, 241, 255); doc.setDrawColor(200, 212, 235); doc.setLineWidth(0.2);
    doc.rect(ml, y, lw, h, 'FD');
    doc.setFillColor(250, 252, 255); doc.rect(ml + lw, y, rw, h, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(30, 60, 120);
    doc.text(lblLines, ml + 4, y + 6.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(15, 25, 55);
    doc.text(valLines, ml + lw + 4, y + 6.5);
    y += h;
  });
  y += 5;

  // ── SIGNATURES — placed so they fit above badge ──
  const resSig = responsibleSigData || localStorage.getItem(SIG_KEY_RESPONSIBLE);
  const cliSig = clientSigData || localStorage.getItem(SIG_KEY_CLIENT);
  const sigH   = 30;
  const sigW   = (W - 14) / 2;

  // If signatures would overlap badge, compress gap
  const sigY = Math.min(y, BADGE_Y - sigH - 6);

  const drawSigBox = (sigData, label, name, x, sy) => {
    doc.setFillColor(248, 250, 255); doc.setDrawColor(200, 212, 235); doc.setLineWidth(0.3);
    doc.roundedRect(x, sy, sigW, sigH, 2, 2, 'FD');
    if (sigData) {
      try { doc.addImage(sigData, 'PNG', x + 3, sy + 2, sigW - 6, 18); } catch {}
    } else {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(160, 175, 205);
      doc.text('[ Firma ]', x + sigW / 2, sy + 13, { align: 'center' });
    }
    doc.setDrawColor(100, 130, 180); doc.setLineWidth(0.6);
    doc.line(x + 5, sy + 22, x + sigW - 5, sy + 22);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(40, 60, 110);
    doc.text(label, x + sigW / 2, sy + 26, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(8, 18, 40);
    doc.text(name || '', x + sigW / 2, sy + 30, { align: 'center' });
  };

  const resSigLabel = form.doc_type === 'garantia' ? 'Responsable de la Garantía' : 'Responsable de la Puesta en Marcha';
  drawSigBox(resSig, resSigLabel, form.responsible_name, ml, sigY);
  drawSigBox(cliSig, 'Firma del Cliente / Representante', form.customer_name, ml + sigW + 14, sigY);

  // ── AUTHORIZED SERVICE BADGE — fixed position above footer ──
  const badgeText = (form.authorized_service || 'SERVICIO AUTORIZADO').toUpperCase();
  const badgeW = 150; const badgeX = (pw - badgeW) / 2;
  doc.setFillColor(248, 246, 238); doc.setDrawColor(160, 135, 65); doc.setLineWidth(0.5);
  doc.roundedRect(badgeX, BADGE_Y, badgeW, BADGE_H, 2, 2, 'FD');
  doc.setDrawColor(160, 135, 65); doc.setLineWidth(0.25);
  doc.line(badgeX + 8, BADGE_Y + 2.2, badgeX + badgeW - 8, BADGE_Y + 2.2);
  doc.line(badgeX + 8, BADGE_Y + 10.8, badgeX + badgeW - 8, BADGE_Y + 10.8);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(110, 85, 25);
  doc.text(`* ${badgeText} *`, pw / 2, BADGE_Y + 7.5, { align: 'center' });

  // ── FOOTER — fixed at very bottom ──
  const footerY = ph - FOOTER_H;
  doc.setFillColor(8, 18, 40); doc.rect(0, footerY, pw, FOOTER_H, 'F');
  doc.setFillColor(30, 70, 140); doc.rect(0, footerY, pw, 1.5, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(200, 215, 245);
  doc.text((settings?.company_name || '').toUpperCase(), pw / 2, footerY + 8, { align: 'center' });
  if (settings?.phone) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(140, 165, 210);
    doc.text(`Tel: ${settings.phone}`, ml, footerY + 8);
  }
  if (settings?.email) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(140, 165, 210);
    doc.text(settings.email, mr, footerY + 8, { align: 'right' });
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(100, 135, 195);
  doc.text('Archivo creado digitalmente por SOLUCIONES TECNOLOGICAS FML  ·  Fono +56982645747', pw / 2, footerY + 15, { align: 'center' });

  return doc;
}

// ── Main Page ──────────────────────────────────────────
export default function Warranty() {
  const [form, setForm]         = useState(defaultForm());
  const [settings, setSettings] = useState(null);
  const [pdfPreview, setPdfPreview] = useState({ open: false, url: null, filename: '' });
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState('new');

  useEffect(() => {
    base44.entities.CompanySettings.list().then(s => {
      if (s.length) {
        setSettings(s[0]);
        setForm(f => ({ ...f, seller_company: s[0].company_name || 'MILLAFOR', responsible_name: s[0].legal_rep || '' }));
      }
    });
  }, []);

  const set = (field, val) => setForm(f => {
    if (field === 'doc_type') {
      return { ...f, doc_type: val, order_number: genOrderNumber(val) };
    }
    return { ...f, [field]: val };
  });

  const handleGeneratePdf = async () => {
    if (!form.customer_name) { toast.error('Ingresa el nombre del cliente'); return; }
    setGenerating(true);
    try {
      const doc = await buildPdf(form, settings, null, null);
      await base44.entities.WarrantyOrder.create({ ...form });
      const filename = `orden-${form.order_number || 'nueva'}.pdf`;
      setPdfPreview({ open: true, url: getPdfBlobUrl(doc), filename });
      uploadDocToDrive(doc, filename, 'puesta_en_marcha')
        .then(() => toast.success('PDF guardado en Google Drive > Puesta en Marcha'))
        .catch(() => {});
      toast.success('Orden generada y guardada en historial');
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const formFields = [
    { label: 'N° Orden', key: 'order_number' },
    { label: 'Fecha', key: 'date', type: 'date' },
    { label: 'Nombre del Cliente', key: 'customer_name', full: true },
    { label: 'Teléfono', key: 'customer_phone' },
    { label: 'Correo Electrónico', key: 'customer_email' },
    { label: 'Marca', key: 'machine_brand' },
    { label: 'Modelo', key: 'machine_model' },
    { label: 'N° Factura o Boleta', key: 'invoice_number' },
    { label: 'Empresa Vendedora', key: 'seller_company' },
    { label: 'Responsable de la Puesta en Marcha', key: 'responsible_name', full: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Garantía / Puesta en Marcha" description="Genera y gestiona órdenes de puesta en marcha">
        {tab === 'new' && (
          <Button onClick={handleGeneratePdf} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {generating ? 'Generando...' : 'Generar PDF'}
          </Button>
        )}
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="new" className="gap-2"><PlusCircle className="h-4 w-4" /> Nueva Orden</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: form */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Datos de la Orden</h3>

                {/* Document type selector */}
                <div className="mb-4">
                  <Label className="text-xs font-medium">Tipo de Documento</Label>
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => set('doc_type', 'puesta_en_marcha')}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                        form.doc_type === 'puesta_en_marcha'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'
                      }`}
                    >
                      Orden de Puesta en Marcha
                    </button>
                    <button
                      type="button"
                      onClick={() => set('doc_type', 'garantia')}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                        form.doc_type === 'garantia'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'
                      }`}
                    >
                      Orden de Garantía
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {formFields.map(f => (
                    <div key={f.key} className={f.full ? 'col-span-2' : ''}>
                      <Label className="text-xs font-medium">{f.label}</Label>
                      <Input type={f.type || 'text'} value={form[f.key]} onChange={e => set(f.key, e.target.value)} className="bg-secondary border-border h-8 text-sm" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Observaciones</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium">Observación principal</Label>
                    <Textarea value={form.observations_1} onChange={e => set('observations_1', e.target.value)} className="bg-secondary border-border text-sm" rows={3} />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Observación secundaria (opcional)</Label>
                    <Textarea value={form.observations_2} onChange={e => set('observations_2', e.target.value)} className="bg-secondary border-border text-sm" rows={2} placeholder="Ej: Se realizó puesta en marcha de Motosierra..." />
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Recomendaciones de Seguridad</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium">EPP / Seguridad</Label>
                    <Textarea value={form.security_epp} onChange={e => set('security_epp', e.target.value)} className="bg-secondary border-border text-sm" rows={3} />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Mantenimiento regular</Label>
                    <Textarea value={form.maintenance} onChange={e => set('maintenance', e.target.value)} className="bg-secondary border-border text-sm" rows={3} />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: signatures + badge */}
            <div className="space-y-4">
              <SignaturePad label="Firma del Responsable / Técnico" storageKey={SIG_KEY_RESPONSIBLE} />
              <SignaturePad label="Firma del Cliente / Representante" storageKey={SIG_KEY_CLIENT} />

              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Distintivo de Servicio Autorizado</h3>
                <p className="text-xs text-muted-foreground mb-2">Este texto aparecerá en el badge al final del PDF.</p>
                <Input
                  value={form.authorized_service}
                  onChange={e => set('authorized_service', e.target.value)}
                  className="bg-secondary border-border text-sm"
                  placeholder="Ej: SERVICIO AUTORIZADO STIHL"
                />
                <div className="mt-3 rounded-lg border px-4 py-2 text-center" style={{background:'#f8f6ee', borderColor:'#a08740'}}>
                  <span className="text-xs font-bold" style={{color:'#6e5519'}}>* {(form.authorized_service || 'SERVICIO AUTORIZADO').toUpperCase()} *</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <HistoryTab settings={settings} />
        </TabsContent>
      </Tabs>

      <PdfPreviewModal
        open={pdfPreview.open}
        onOpenChange={open => setPdfPreview(p => ({ ...p, open }))}
        blobUrl={pdfPreview.url}
        filename={pdfPreview.filename}
      />
    </div>
  );
}