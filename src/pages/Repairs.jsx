import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Wrench, Plus, Search, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import RepairFormDialog from '../components/repairs/RepairFormDialog';
import RepairDetailDialog from '../components/repairs/RepairDetailDialog';

export default function Repairs() {
  const [repairs, setRepairs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editRepair, setEditRepair] = useState(null);
  const [detailRepair, setDetailRepair] = useState(null);

  async function loadData() {
    const [r, c, m, p] = await Promise.all([
      base44.entities.RepairOrder.list('-created_date'),
      base44.entities.Customer.list(),
      base44.entities.Machine.list(),
      base44.entities.Product.list(),
    ]);
    setRepairs(r);
    setCustomers(c);
    setMachines(m);
    setProducts(p);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const filtered = repairs.filter(r => {
    const matchSearch = !search || 
      (r.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.machine_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.order_number || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Órdenes de Reparación" description="Gestiona las reparaciones de equipos">
        <Button onClick={() => { setEditRepair(null); setFormOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Nueva Orden
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente, equipo o número..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-card border-border">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="en_proceso">En Proceso</SelectItem>
            <SelectItem value="finalizada">Finalizada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Wrench} title="Sin reparaciones" description="Crea tu primera orden de reparación" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Orden</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Equipo</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Fecha</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Total</th>
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-medium text-foreground">#{r.order_number || r.id?.substring(0, 6)}</td>
                    <td className="p-4 text-muted-foreground">{r.customer_name || '-'}</td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">{r.machine_name || '-'}</td>
                    <td className="p-4 text-muted-foreground hidden lg:table-cell">{r.date || '-'}</td>
                    <td className="p-4"><StatusBadge status={r.status} /></td>
                    <td className="p-4 text-foreground font-medium hidden md:table-cell">${(r.total || 0).toLocaleString('es-CL')}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailRepair(r)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setEditRepair(r); setFormOpen(true); }}>
                          Editar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RepairFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        repair={editRepair}
        customers={customers}
        machines={machines}
        products={products}
        onSaved={loadData}
      />

      <RepairDetailDialog
        repair={detailRepair}
        onClose={() => setDetailRepair(null)}
      />
    </div>
  );
}