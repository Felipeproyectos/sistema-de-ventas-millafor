import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Plus, Search, Eye, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import QuoteFormDialog from '../components/quotes/QuoteFormDialog';
import QuoteDetailDialog from '../components/quotes/QuoteDetailDialog';
import { toast } from "sonner";

const statusMap = {
  pendiente: { label: 'Pendiente', class: 'bg-warning/10 text-warning' },
  aceptada: { label: 'Aceptada', class: 'bg-accent/10 text-accent' },
  rechazada: { label: 'Rechazada', class: 'bg-destructive/10 text-destructive' },
};

export default function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  async function load() {
    const [q, c, m, p] = await Promise.all([
      base44.entities.Quote.list('-created_date'),
      base44.entities.Customer.list(),
      base44.entities.Machine.list(),
      base44.entities.Product.list(),
    ]);
    setQuotes(q); setCustomers(c); setMachines(m); setProducts(p);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    await base44.entities.Quote.delete(deleteId);
    setDeleteId(null);
    toast.success('Cotización eliminada');
    load();
  };

  const filtered = quotes.filter(q => {
    const matchSearch = !search ||
      q.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      q.quote_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <PageHeader title="Cotizaciones" description="Gestión de presupuestos y ofertas">
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nueva Cotización
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente o número..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 bg-card border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="aceptada">Aceptadas</SelectItem>
            <SelectItem value="rechazada">Rechazadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {['pendiente', 'aceptada', 'rechazada'].map(s => {
          const count = quotes.filter(q => q.status === s).length;
          const st = statusMap[s];
          return (
            <div key={s} className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <p className={`text-xs font-medium mt-0.5 ${st.class.split(' ')[1]}`}>{st.label}</p>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="Sin cotizaciones" description="Crea tu primera cotización para un cliente" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">N°</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Tipo</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Fecha</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Válida hasta</th>
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase">Total</th>
                  <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => {
                  const st = statusMap[q.status] || statusMap.pendiente;
                  return (
                    <tr key={q.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="p-4 font-mono text-xs text-muted-foreground">{q.quote_number || q.id?.substring(0, 6)}</td>
                      <td className="p-4 font-medium">{q.customer_name}</td>
                      <td className="p-4 text-muted-foreground hidden md:table-cell capitalize">{q.type === 'reparacion' ? 'Reparación' : 'Venta'}</td>
                      <td className="p-4 text-muted-foreground hidden sm:table-cell">{q.date}</td>
                      <td className="p-4 text-muted-foreground hidden lg:table-cell">{q.expiry_date || '-'}</td>
                      <td className="p-4 text-right font-semibold text-primary">${(q.total || 0).toLocaleString('es-CL')}</td>
                      <td className="p-4 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${st.class}`}>{st.label}</span>
                        {q.converted_to && <span className="block text-[10px] text-accent mt-0.5">Convertida</span>}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedQuote(q)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!q.converted_to && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(q.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <QuoteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customers={customers}
        machines={machines}
        products={products}
        onSaved={load}
      />

      <QuoteDetailDialog
        quote={selectedQuote}
        onClose={() => setSelectedQuote(null)}
        onRefresh={load}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cotización?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}