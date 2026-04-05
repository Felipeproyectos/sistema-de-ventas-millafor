import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Phone, Mail, Calendar, Edit2, Trash2, Plus, AlertTriangle, Clock, FileText, Loader2 } from 'lucide-react';
import { generateCreditIndividualPdf } from '../../lib/creditReportPdf';
import { uploadDocToDrive } from '../../lib/driveUpload';
import PdfPreviewModal from '../PdfPreviewModal';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig = {
  pendiente: { label: 'Pendiente', color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20' },
  pagado: { label: 'Pagado', color: 'text-green-600 bg-green-500/10 border-green-500/20' },
  vencido: { label: 'Vencido', color: 'text-red-600 bg-red-500/10 border-red-500/20' }
};

export default function CreditCard({ credit, onEdit, onDelete, onRefresh, settings }) {
  const queryClient = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [pdfPreview, setPdfPreview] = useState({ open: false, url: null });
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    const { url, doc } = await generateCreditIndividualPdf(credit, settings);
    setPdfPreview({ open: true, url });
    setGeneratingPdf(false);
    const filename = `credito-${(credit.client_name || 'cliente').replace(/\s+/g, '-').toLowerCase()}-${credit.id?.slice(0,6)}.pdf`;
    uploadDocToDrive(doc, filename, 'credito').then(() => toast.success('PDF guardado en Google Drive')).catch(() => {});
  };

  const remaining = credit.total_amount - (credit.amount_paid || 0);
  const progress = Math.min(100, ((credit.amount_paid || 0) / credit.total_amount) * 100);
  const cfg = statusConfig[credit.status] || statusConfig.pendiente;

  const isOverdue = credit.daysLeft < 0 && credit.status !== 'pagado';
  const isNearDue = credit.daysLeft >= 0 && credit.daysLeft <= 7 && credit.status !== 'pagado';

  const handleAddPayment = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;
    const newPaid = (credit.amount_paid || 0) + amount;
    const payments = [...(credit.payments || []), { date: new Date().toISOString().split('T')[0], amount, note: payNote }];
    const newStatus = newPaid >= credit.total_amount ? 'pagado' : credit.status;
    await base44.entities.CreditSale.update(credit.id, { amount_paid: newPaid, payments, status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['credits'] });
    onRefresh();
    setShowPayment(false);
    setPayAmount('');
    setPayNote('');
  };

  return (
    <div className={`bg-card border rounded-xl p-4 space-y-3 ${isOverdue ? 'border-red-500/40' : isNearDue ? 'border-yellow-500/40' : 'border-border'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-sm">{credit.client_name}</h3>
            {isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
            {isNearDue && <Clock className="h-3.5 w-3.5 text-yellow-500" />}
          </div>
          {credit.client_rut && <p className="text-xs text-muted-foreground">RUT: {credit.client_rut}</p>}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}>{cfg.label}</span>
      </div>

      {/* Contact */}
      <div className="flex flex-wrap gap-3">
        {credit.client_phone && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{credit.client_phone}</span>}
        {credit.client_email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{credit.client_email}</span>}
      </div>

      {/* Description */}
      <div className="bg-secondary/40 rounded-lg p-3">
        <p className="text-xs text-muted-foreground mb-0.5">Producto/Servicio</p>
        <p className="text-sm text-foreground">{credit.description}</p>
        {credit.service_date && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(parseISO(credit.service_date), "d MMM yyyy", { locale: es })}
          </p>
        )}
      </div>

      {/* Amounts */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Abonado: <span className="text-foreground font-medium">${(credit.amount_paid || 0).toLocaleString('es-CL')}</span></span>
          <span>Restante: <span className={`font-bold ${remaining > 0 ? 'text-destructive' : 'text-green-600'}`}>${Math.max(0, remaining).toLocaleString('es-CL')}</span></span>
        </div>
        <div className="w-full bg-secondary rounded-full h-1.5">
          <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-muted-foreground text-right">Total: ${credit.total_amount?.toLocaleString('es-CL')}</p>
      </div>

      {/* Due date */}
      <div className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-2 ${isOverdue ? 'bg-red-500/10 text-red-600' : isNearDue ? 'bg-yellow-500/10 text-yellow-600' : 'bg-secondary text-muted-foreground'}`}>
        <Calendar className="h-3 w-3" />
        <span>Vence: {format(parseISO(credit.due_date), "d MMM yyyy", { locale: es })}</span>
        {isOverdue && <span className="ml-auto font-medium">Vencido hace {Math.abs(credit.daysLeft)} días</span>}
        {isNearDue && <span className="ml-auto font-medium">Vence en {credit.daysLeft} días</span>}
      </div>

      {/* Add payment form */}
      {showPayment && (
        <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">Registrar Abono</p>
          <input type="number" placeholder="Monto" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input type="text" placeholder="Nota (opcional)" value={payNote} onChange={e => setPayNote(e.target.value)} className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <div className="flex gap-2">
            <button onClick={() => setShowPayment(false)} className="flex-1 text-xs py-1.5 border border-border rounded-lg text-muted-foreground hover:bg-secondary">Cancelar</button>
            <button onClick={handleAddPayment} className="flex-1 text-xs py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">Registrar</button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1 flex-wrap">
        {credit.status !== 'pagado' && (
          <button onClick={() => setShowPayment(!showPayment)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
            <Plus className="h-3 w-3" /> Abonar
          </button>
        )}
        <button onClick={handleGeneratePdf} disabled={generatingPdf} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-secondary text-muted-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50">
          {generatingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />} PDF
        </button>
        <button onClick={() => onEdit(credit)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-secondary text-muted-foreground rounded-lg hover:bg-secondary/80 transition-colors">
          <Edit2 className="h-3 w-3" /> Editar
        </button>
        <button onClick={() => onDelete(credit.id)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors ml-auto">
          <Trash2 className="h-3 w-3" /> Eliminar
        </button>
      </div>

      <PdfPreviewModal
        open={pdfPreview.open}
        onOpenChange={open => setPdfPreview(p => ({ ...p, open }))}
        blobUrl={pdfPreview.url}
        filename={`credito-${(credit.client_name || 'cliente').replace(/\s+/g, '-').toLowerCase()}.pdf`}
      />
    </div>
  );
}