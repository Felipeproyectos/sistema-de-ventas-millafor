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
import { FileText, Loader2, Pen, Upload, Trash2, Search, History, PlusCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

// ── Color palette ──────────────────────────────────────
const C = {
  DARK:  [8, 15, 30],
  NAVY:  [12, 35, 70],
  BLUE:  [25, 60, 115],
  MID:   [45, 80, 130],
  SLATE: [90, 115, 160],
  LGRAY: [228, 234, 245],
  BORDER:[175, 190, 215],
  WHITE: [255, 255, 255],
  GOLD:  [180, 145, 60],
};

const SIG_KEY_RESPONSIBLE = 'warranty_sig_responsible';
const SIG_KEY_CLIENT      = 'warranty_sig_client';

const defaultForm = () => ({
  order_number: '',
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
});

// ── Signature Pad Component ────────────────────────────
function SignaturePad({ label, storageKey }) {
  const canvasRef = useRef(null);
  const fileRef   = useRef(null);
  const lastPos   = useRef(null);
  const [drawMode, setDrawMode]   = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSig, setHasSig]       = useState(false);

  // Load from localStorage on mount
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
      {hasSig && !drawMode && <p className="text-xs text-green-400 mt-2">✓ Esta firma se usará en el PDF. Puedes reemplazarla subiendo una nueva imagen o dibujando.</p>}
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
    const { jsPDF } = await import('jspdf');
    const doc = await buildPdf(order, settings, null, null);
    if (doc) setPdfPreview({ open: true, url: getPdfBlobUrl(doc), filename: `orden-${order.order_number}.pdf` });
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
              <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0" onClick={() => handleRegenerate(o)}>
                <FileText className="h-3.5 w-3.5" /> Ver PDF
              </Button>
            </div>
          ))}
        </div>
      )}
      <PdfPreviewModal open={pdfPreview.open} onOpenChange={open => setPdfPreview(p => ({ ...p, open }))} blobUrl={pdfPreview.url} filename={pdfPreview.filename} />
    </div>
  );
}

// ── PDF builder (shared) ───────────────────────────────
async function buildPdf(form, settings, responsibleSigData, clientSigData) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 14, mr = pw - 14;

  // Top bar
  doc.setFillColor(...C.DARK); doc.rect(0, 0, pw, 6, 'F');
  doc.setFillColor(...C.BLUE); doc.rect(0, 6, pw, 2, 'F');

  // ── HEADER: company info LEFT, logo RIGHT ──
  let y = 12;

  // Company info — LEFT
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...C.DARK);
  doc.text((settings?.company_name || 'EMPRESA').toUpperCase(), ml, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.NAVY);
  if (settings?.legal_rep) { doc.text(`Rep. Legal: ${settings.legal_rep}`, ml, y); y += 5; }
  if (settings?.tax_id)    { doc.text(`RUT: ${settings.tax_id}`, ml, y); y += 5; }
  if (settings?.phone)     { doc.text(`Tel: ${settings.phone}`, ml, y); y += 5; }
  if (settings?.email)     { doc.text(settings.email, ml, y); y += 5; }
  if (settings?.address)   { doc.text(settings.address, ml, y); y += 5; }

  // Logo — RIGHT (big, square)
  const logoSize = 38;
  const logoX = mr - logoSize;
  if (settings?.logo_url) {
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image(); i.crossOrigin = 'anonymous';
        i.onload = () => res(i); i.onerror = rej; i.src = settings.logo_url;
      });
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      doc.addImage(c.toDataURL('image/png'), 'PNG', logoX, 10, logoSize, logoSize);
    } catch {}
  }

  let hdrBottom = Math.max(y, 50) + 4;

  // Divider
  doc.setDrawColor(...C.NAVY); doc.setLineWidth(1); doc.line(ml, hdrBottom, mr, hdrBottom); hdrBottom += 7;

  // Title block
  doc.setFillColor(...C.DARK); doc.rect(ml, hdrBottom - 1, mr - ml, 13, 'F');
  doc.setDrawColor(...C.BLUE); doc.setLineWidth(0.6); doc.rect(ml, hdrBottom - 1, mr - ml, 13, 'D');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...C.WHITE);
  doc.text('ORDEN DE PUESTA EN MARCHA', pw / 2, hdrBottom + 8, { align: 'center' });
  hdrBottom += 15;

  // N° and date row
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...C.DARK);
  doc.text(`N° ${form.order_number || '—'}`, ml, hdrBottom + 4);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C.NAVY);
  doc.text(`FECHA: ${form.date}`, mr, hdrBottom + 4, { align: 'right' });
  hdrBottom += 10;

  // ── CLIENT TABLE ──
  const tblData = [
    ['NOMBRE DEL CLIENTE', form.customer_name || ''],
    ['TELÉFONO', form.customer_phone || ''],
    ['CORREO ELECTRÓNICO', form.customer_email || ''],
    ['MARCA', form.machine_brand || ''],
    ['MODELO', form.machine_model || ''],
    ['N° FACTURA O BOLETA', form.invoice_number || ''],
    ['EMPRESA VENDEDORA', form.seller_company || ''],
  ];
  const colW1 = 62, colW2 = mr - ml - colW1;
  tblData.forEach((row, i) => {
    const ry = hdrBottom + i * 9;
    doc.setFillColor(...(i % 2 === 0 ? C.LGRAY : C.WHITE));
    doc.setDrawColor(...C.BORDER); doc.setLineWidth(0.3);
    doc.rect(ml, ry, colW1, 9, 'FD'); doc.rect(ml + colW1, ry, colW2, 9, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...C.DARK);
    doc.text(row[0], ml + 3, ry + 6.2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.NAVY);
    doc.text(row[1], ml + colW1 + 3, ry + 6.2);
  });
  let ty = hdrBottom + tblData.length * 9 + 7;

  // ── Section helper ──
  const secHeader = (title, yy) => {
    doc.setFillColor(...C.NAVY); doc.rect(ml, yy, mr - ml, 9, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...C.WHITE);
    doc.text(title, pw / 2, yy + 6.3, { align: 'center' });
    return yy + 9;
  };
  const textBox = (text, yy, minH = 16) => {
    if (!text) return yy + minH;
    const lines = doc.splitTextToSize(text, mr - ml - 8);
    const h = Math.max(minH, lines.length * 5.5 + 6);
    doc.setFillColor(...C.WHITE); doc.setDrawColor(...C.BORDER); doc.setLineWidth(0.3);
    doc.rect(ml, yy, mr - ml, h, 'FD');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.DARK);
    doc.text(lines, pw / 2, yy + 6, { align: 'center' });
    return yy + h + 3;
  };

  // Observations
  ty = secHeader('Observaciones de Puesta en Marcha', ty);
  ty = textBox(form.observations_1, ty);
  if (form.observations_2) ty = textBox(form.observations_2, ty);
  ty += 3;

  // Security
  ty = secHeader('Recomendaciones de Seguridad:', ty);
  const secRows = [
    ['Recomendaciones\nde Seguridad:', form.security_epp || ''],
    ['Mantenimiento\nregular:', form.maintenance || ''],
  ];
  secRows.forEach(([lbl, val]) => {
    const lw = (mr - ml) * 0.30; const rw = (mr - ml) - lw;
    const lines = doc.splitTextToSize(val, rw - 6);
    const lblLines = doc.splitTextToSize(lbl, lw - 4);
    const h = Math.max(20, Math.max(lines.length, lblLines.length) * 5.5 + 8);
    doc.setFillColor(...C.WHITE); doc.setDrawColor(...C.BORDER); doc.setLineWidth(0.3);
    doc.rect(ml, ty, lw, h, 'FD'); doc.rect(ml + lw, ty, rw, h, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...C.DARK);
    doc.text(lblLines, ml + 3, ty + 7);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.NAVY);
    doc.text(lines, ml + lw + 4, ty + 7);
    ty += h;
  });
  ty += 8;

  // ── SIGNATURES ──
  const sigW = (mr - ml - 12) / 2;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...C.DARK);
  doc.text('Firmas:', ml, ty); ty += 5;

  // Try load signatures from localStorage if not passed
  const resSig = responsibleSigData || localStorage.getItem(SIG_KEY_RESPONSIBLE);
  const cliSig = clientSigData || localStorage.getItem(SIG_KEY_CLIENT);

  if (resSig) { try { doc.addImage(resSig, 'PNG', ml, ty, sigW, 18); } catch {} }
  if (cliSig) { try { doc.addImage(cliSig, 'PNG', ml + sigW + 12, ty, sigW, 18); } catch {} }
  ty += 20;

  doc.setDrawColor(...C.SLATE); doc.setLineWidth(0.5);
  doc.line(ml, ty, ml + sigW, ty);
  doc.line(ml + sigW + 12, ty, mr, ty);
  ty += 5;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...C.DARK);
  doc.text('Responsable de la Puesta en Marcha:', ml, ty);
  doc.text('Firma del Cliente / Representante:', ml + sigW + 12, ty);
  ty += 4.5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.NAVY);
  doc.text(form.responsible_name || '', ml, ty);
  doc.text(form.customer_name || '', ml + sigW + 12, ty);
  ty += 10;

  // ── STIHL BADGE ──
  const badgeW = 110; const badgeX = (pw - badgeW) / 2;
  doc.setFillColor(...C.DARK); doc.roundedRect(badgeX, ty, badgeW, 13, 3, 3, 'F');
  doc.setDrawColor(...C.BLUE); doc.setLineWidth(0.8); doc.roundedRect(badgeX, ty, badgeW, 13, 3, 3, 'D');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(160, 185, 255);
  doc.text('★  SERVICIO AUTORIZADO STIHL  ★', pw / 2, ty + 9, { align: 'center' });

  // ── FOOTER ──
  doc.setFillColor(...C.DARK); doc.rect(0, ph - 11, pw, 11, 'F');
  doc.setFillColor(...C.BLUE); doc.rect(0, ph - 12.5, pw, 1.5, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(180, 200, 255);
  doc.text(settings?.company_name || '', pw / 2, ph - 5, { align: 'center' });
  if (settings?.phone) doc.text(`Tel: ${settings.phone}`, ml, ph - 5);
  if (settings?.email) doc.text(settings.email, mr, ph - 5, { align: 'right' });

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

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleGeneratePdf = async () => {
    if (!form.customer_name) { toast.error('Ingresa el nombre del cliente'); return; }
    setGenerating(true);
    try {
      const doc = await buildPdf(form, settings, null, null);
      // Save to history
      await base44.entities.WarrantyOrder.create({ ...form });
      const filename = `orden-${form.order_number || 'nueva'}.pdf`;
      setPdfPreview({ open: true, url: getPdfBlobUrl(doc), filename });
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

        {/* ── NUEVA ORDEN ── */}
        <TabsContent value="new" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: form */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Datos de la Orden</h3>
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

            {/* Right: company info + signatures */}
            <div className="space-y-4">
              {settings && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Datos de la Empresa</h3>
                  <div className="space-y-1.5 text-sm">
                    <p><span className="text-muted-foreground text-xs">Empresa:</span> <span className="font-semibold">{settings.company_name}</span></p>
                    {settings.legal_rep && <p><span className="text-muted-foreground text-xs">Rep. Legal:</span> <span className="font-medium">{settings.legal_rep}</span></p>}
                    {settings.tax_id && <p><span className="text-muted-foreground text-xs">RUT:</span> <span className="font-medium">{settings.tax_id}</span></p>}
                    {settings.phone && <p><span className="text-muted-foreground text-xs">Tel:</span> <span className="font-medium">{settings.phone}</span></p>}
                    {settings.email && <p><span className="text-muted-foreground text-xs">Email:</span> <span className="font-medium">{settings.email}</span></p>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">Modifica estos datos en <strong>Configuración</strong>.</p>
                </div>
              )}

              <SignaturePad label="Firma del Responsable / Técnico" storageKey={SIG_KEY_RESPONSIBLE} />
              <SignaturePad label="Firma del Cliente / Representante" storageKey={SIG_KEY_CLIENT} />

              <div className="bg-navy/10 border border-blue-900/40 rounded-xl p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Servicio Autorizado STIHL</p>
                  <p className="text-xs text-muted-foreground">El distintivo aparecerá al final del PDF generado.</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── HISTORIAL ── */}
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