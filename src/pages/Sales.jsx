import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, Plus, Search, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import SaleFormDialog from '../components/sales/SaleFormDialog';
import SaleDetailDialog from '../components/sales/SaleDetailDialog';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detailSale, setDetailSale] = useState(null);

  async function loadData() {
    const [s, c, p] = await Promise.all([
      base44.entities.SaleOrder.list('-created_date'),
      base44.entities.Customer.list(),
      base44.entities.Product.list(),
    ]);
    setSales(s);
    setCustomers(c);
    setProducts(p);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const filtered = sales.filter(s =>
    !search || (s.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.order_number || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <PageHeader title="Ventas" description="Gestión de órdenes de venta">
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nueva Venta
        </Button>
      </PageHeader>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por cliente o número..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Sin ventas" description="Crea tu primera orden de venta" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Venta</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Fecha</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Items</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-medium">#{s.order_number || s.id?.substring(0, 6)}</td>
                    <td className="p-4 text-muted-foreground">{s.customer_name || '-'}</td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">{s.date || '-'}</td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">{s.items?.length || 0}</td>
                    <td className="p-4 font-medium text-primary">${(s.total || 0).toLocaleString('es-CL')}</td>
                    <td className="p-4"><StatusBadge status={s.status} /></td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailSale(s)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SaleFormDialog open={formOpen} onOpenChange={setFormOpen} customers={customers} products={products} onSaved={loadData} />
      <SaleDetailDialog sale={detailSale} onClose={() => setDetailSale(null)} />
    </div>
  );
}