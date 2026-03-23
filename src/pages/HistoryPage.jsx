import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { History, Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';

export default function HistoryPage() {
  const [repairs, setRepairs] = useState([]);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [machineFilter, setMachineFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    async function load() {
      const [r, s, c, m] = await Promise.all([
        base44.entities.RepairOrder.list('-created_date'),
        base44.entities.SaleOrder.list('-created_date'),
        base44.entities.Customer.list(),
        base44.entities.Machine.list(),
      ]);
      setRepairs(r); setSales(s); setCustomers(c); setMachines(m); setLoading(false);
    }
    load();
  }, []);

  // Combine all records
  const allRecords = [
    ...repairs.map(r => ({ ...r, type: 'repair', sortDate: r.date || r.created_date })),
    ...sales.map(s => ({ ...s, type: 'sale', sortDate: s.date || s.created_date })),
  ].sort((a, b) => (b.sortDate || '').localeCompare(a.sortDate || ''));

  const filtered = allRecords.filter(r => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (customerFilter !== 'all' && r.customer_id !== customerFilter) return false;
    if (machineFilter !== 'all' && r.type === 'repair' && r.machine_id !== machineFilter) return false;
    if (machineFilter !== 'all' && r.type === 'sale') return false;
    if (search) {
      const s = search.toLowerCase();
      return (r.customer_name || '').toLowerCase().includes(s) ||
        (r.machine_name || '').toLowerCase().includes(s) ||
        (r.order_number || '').toLowerCase().includes(s);
    }
    return true;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <PageHeader title="Historial" description="Registro completo de reparaciones y ventas" />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-card border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="repair">Reparaciones</SelectItem>
            <SelectItem value="sale">Ventas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-card border-border"><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los clientes</SelectItem>
            {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={machineFilter} onValueChange={setMachineFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-card border-border"><SelectValue placeholder="Equipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los equipos</SelectItem>
            {machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={History} title="Sin registros" description="No se encontraron registros con los filtros aplicados" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Orden</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Equipo</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Fecha</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={`${r.type}-${r.id}`} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        r.type === 'repair' ? 'bg-primary/15 text-primary' : 'bg-accent/15 text-accent'
                      }`}>
                        {r.type === 'repair' ? 'Reparación' : 'Venta'}
                      </span>
                    </td>
                    <td className="p-4 font-medium">#{r.order_number || r.id?.substring(0, 6)}</td>
                    <td className="p-4 text-muted-foreground">{r.customer_name || '-'}</td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">{r.machine_name || '-'}</td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">{r.date || '-'}</td>
                    <td className="p-4"><StatusBadge status={r.status} /></td>
                    <td className="p-4 text-right font-medium">${(r.total || 0).toLocaleString('es-CL')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}