import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, CreditCard, AlertTriangle, CheckCircle, Clock, Search, X, FileText, Loader2 } from 'lucide-react';
import { uploadDocToDrive } from '../lib/driveUpload';
import PdfPreviewModal from '../components/PdfPreviewModal';
import { generateCreditReportPdf } from '../lib/creditReportPdf';
import PageHeader from '../components/PageHeader';
import CreditForm from '../components/credit/CreditForm';
import CreditCard2 from '../components/credit/CreditCard';
import { differenceInDays, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function Credit() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCredit, setEditingCredit] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [pdfPreview, setPdfPreview] = useState({ open: false, url: null });
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [settings, setSettings] = useState(null);

  useState(() => {
    base44.entities.CompanySettings.list().then(s => { if (s.length) setSettings(s[0]); });
  }, []);

  const { data: credits = [], isLoading } = useQuery({
    queryKey: ['credits'],
    queryFn: () => base44.entities.CreditSale.list('-created_date')
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  const today = new Date();

  const enriched = credits.map(c => {
    const daysLeft = differenceInDays(parseISO(c.due_date), today);
    const remaining = (c.total_amount || 0) - (c.amount_paid || 0);
    return { ...c, daysLeft, remaining };
  });

  const filtered = enriched.filter(c => {
    const matchSearch = !search || c.client_name?.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: credits.length,
    pending: credits.filter(c => c.status === 'pendiente').length,
    overdue: enriched.filter(c => c.status !== 'pagado' && c.daysLeft < 0).length,
    nearDue: enriched.filter(c => c.status !== 'pagado' && c.daysLeft >= 0 && c.daysLeft <= 7).length,
    totalDebt: enriched.reduce((sum, c) => sum + (c.remaining > 0 ? c.remaining : 0), 0)
  };

  const handleSave = async (data) => {
    if (editingCredit) {
      await base44.entities.CreditSale.update(editingCredit.id, data);
    } else {
      await base44.entities.CreditSale.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['credits'] });
    setShowForm(false);
    setEditingCredit(null);
  };

  const handleDelete = async (id) => {
    await base44.entities.CreditSale.delete(id);
    queryClient.invalidateQueries({ queryKey: ['credits'] });
  };

  const handleGenerateReport = async () => {
    setGeneratingPdf(true);
    const { url, doc } = await generateCreditReportPdf(enriched, settings);
    setPdfPreview({ open: true, url });
    setGeneratingPdf(false);
    const today = new Date().toISOString().split('T')[0];
    const filename = `informe-creditos-${today}.pdf`;
    uploadDocToDrive(doc, filename, 'credito')
      .then(() => toast.success('Informe guardado en Google Drive > Crédito'))
      .catch(() => {});
  };

  const handleEdit = (credit) => {
    setEditingCredit(credit);
    setShowForm(true);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Créditos"
        description="Gestión de ventas y servicios a crédito"
      >
        <button
          onClick={handleGenerateReport}
          disabled={generatingPdf || credits.length === 0}
          className="flex items-center gap-2 bg-secondary text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors border border-border disabled:opacity-50"
        >
          {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Informe PDF
        </button>
        <button
          onClick={() => { setEditingCredit(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nuevo Crédito
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Créditos</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="bg-card border border-destructive/30 rounded-xl p-4">
          <p className="text-xs text-destructive mb-1">Vencidos</p>
          <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
        </div>
        <div className="bg-card border border-yellow-500/30 rounded-xl p-4">
          <p className="text-xs text-yellow-600 mb-1">Por vencer (7 días)</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.nearDue}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Deuda Total</p>
          <p className="text-2xl font-bold text-foreground">${stats.totalDebt.toLocaleString('es-CL')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar cliente o producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="vencido">Vencido</option>
          <option value="pagado">Pagado</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay créditos registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(credit => (
            <CreditCard2
              key={credit.id}
              credit={credit}
              settings={settings}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['credits'] })}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      <PdfPreviewModal
        open={pdfPreview.open}
        onOpenChange={open => setPdfPreview(p => ({ ...p, open }))}
        blobUrl={pdfPreview.url}
        filename={`informe-creditos-${new Date().toLocaleDateString('es-CL').replace(/\//g, '-')}.pdf`}
      />

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold text-foreground">{editingCredit ? 'Editar Crédito' : 'Nuevo Crédito'}</h2>
              <button onClick={() => { setShowForm(false); setEditingCredit(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <CreditForm initialData={editingCredit} onSave={handleSave} onCancel={() => { setShowForm(false); setEditingCredit(null); }} customers={customers} />
          </div>
        </div>
      )}
    </div>
  );
}