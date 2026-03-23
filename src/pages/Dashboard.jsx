import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Wrench, Package, ShoppingCart, Clock, MapPin, Phone, Mail, Globe } from 'lucide-react';
import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';
import DashboardCharts from '../components/dashboard/DashboardCharts';
import RecentActivity from '../components/dashboard/RecentActivity';
import LowStockAlert from '../components/dashboard/LowStockAlert';

export default function Dashboard() {
  const [repairs, setRepairs] = useState([]);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [r, p, s, cs] = await Promise.all([
        base44.entities.RepairOrder.list(),
        base44.entities.Product.list(),
        base44.entities.SaleOrder.list(),
        base44.entities.CompanySettings.list(),
      ]);
      setRepairs(r);
      setProducts(p);
      setSales(s);
      if (cs.length) setSettings(cs[0]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const pendingRepairs = repairs.filter(r => r.status === 'pendiente').length;
  const inProgressRepairs = repairs.filter(r => r.status === 'en_proceso').length;
  const totalSalesAmount = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const lowStockProducts = products.filter(p => (p.stock || 0) <= (p.min_stock || 5));
  const totalRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0) +
    repairs.filter(r => r.status === 'finalizada').reduce((sum, r) => sum + (r.total || 0), 0);

  return (
    <div className="space-y-6">
      {settings && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="logo" className="h-12 w-12 object-contain rounded-lg" />
              ) : (
                <Wrench className="h-7 w-7 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground leading-tight">{settings.company_name}</h2>
              {settings.tax_id && <p className="text-xs text-muted-foreground">RUT/NIT: {settings.tax_id}</p>}
            </div>
          </div>
          {(settings.address || settings.phone || settings.email || settings.website) && (
            <div className="mt-3 pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-1 gap-x-4">
              {settings.address && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3 w-3 flex-shrink-0" /><span className="truncate">{settings.address}</span></span>}
              {settings.phone && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3 w-3 flex-shrink-0" /><span className="truncate">{settings.phone}</span></span>}
              {settings.email && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3 w-3 flex-shrink-0" /><span className="truncate">{settings.email}</span></span>}
              {settings.website && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Globe className="h-3 w-3 flex-shrink-0" /><span className="truncate">{settings.website}</span></span>}
            </div>
          )}
        </div>
      )}

      <PageHeader
        title="Dashboard"
        description="Resumen general de tu negocio"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Reparaciones Pendientes"
          value={pendingRepairs}
          subtitle={`${inProgressRepairs} en proceso`}
          icon={Clock}
        />
        <StatCard
          title="Total Reparaciones"
          value={repairs.length}
          subtitle={`${repairs.filter(r => r.status === 'finalizada').length} finalizadas`}
          icon={Wrench}
          trend="up"
        />
        <StatCard
          title="Ventas Totales"
          value={`$${totalSalesAmount.toLocaleString('es-CL')}`}
          subtitle={`${sales.length} órdenes`}
          icon={ShoppingCart}
          trend="up"
        />
        <StatCard
          title="Productos en Stock"
          value={products.length}
          subtitle={lowStockProducts.length > 0 ? `${lowStockProducts.length} con stock bajo` : 'Stock OK'}
          icon={Package}
          trend={lowStockProducts.length > 0 ? 'down' : 'up'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <DashboardCharts repairs={repairs} sales={sales} />
        </div>
        <div className="space-y-4">
          <LowStockAlert products={lowStockProducts} />
          <RecentActivity repairs={repairs} sales={sales} />
        </div>
      </div>
    </div>
  );
}