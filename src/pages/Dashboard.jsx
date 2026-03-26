import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Wrench, Package, ShoppingCart, Clock, MapPin, Phone, Mail, Globe } from 'lucide-react';
import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';
import DashboardCharts from '../components/dashboard/DashboardCharts';
import RecentActivity from '../components/dashboard/RecentActivity';
import LowStockAlert from '../components/dashboard/LowStockAlert';
import DeliveryAlerts from '../components/dashboard/DeliveryAlerts';
import CreditAlerts from '../components/dashboard/CreditAlerts';

export default function Dashboard() {
  const { data: repairs = [], isLoading: repairsLoading } = useQuery({ queryKey: ['repairs'], queryFn: () => base44.entities.RepairOrder.list(), staleTime: 1000 * 60 * 5 });
  const { data: products = [], isLoading: productsLoading } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list(), staleTime: 1000 * 60 * 5 });
  const { data: sales = [], isLoading: salesLoading } = useQuery({ queryKey: ['sales'], queryFn: () => base44.entities.SaleOrder.list(), staleTime: 1000 * 60 * 5 });
  const { data: settingsList = [], isLoading: settingsLoading } = useQuery({ queryKey: ['settings'], queryFn: () => base44.entities.CompanySettings.list(), staleTime: 1000 * 60 * 30 });
  
  const settings = settingsList[0] || null;
  const loading = repairsLoading || productsLoading || salesLoading || settingsLoading;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  const pendingRepairs = repairs.filter(r => r.status === 'pendiente').length;
  const inProgressRepairs = repairs.filter(r => r.status === 'en_proceso').length;
  const totalSalesAmount = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const lowStockProducts = products?.filter(p => (p.stock || 0) <= (p.min_stock || 5)) || [];
  const totalRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0) +
    repairs.filter(r => r.status === 'finalizada').reduce((sum, r) => sum + (r.total || 0), 0);

  return (
    <div className="space-y-6">
      {settings && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
            <div className="h-16 w-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="logo" className="h-14 w-14 object-contain rounded-lg" />
              ) : (
                <Wrench className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Empresa</p>
              <h2 className="text-xl font-bold text-foreground leading-tight">{settings.company_name}</h2>
              {settings.tax_id && <p className="text-xs text-muted-foreground mt-0.5">RUT/NIT: <span className="font-semibold text-foreground">{settings.tax_id}</span></p>}
              {settings.legal_rep && <p className="text-xs text-muted-foreground">Rep. Legal: <span className="font-semibold text-foreground">{settings.legal_rep}</span></p>}
            </div>
          </div>
          {(settings.address || settings.phone || settings.email || settings.website) && (
            <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {settings.address && (
                <div className="flex items-center gap-2 bg-secondary/40 rounded-lg px-3 py-2">
                  <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="text-xs text-foreground truncate">{settings.address}</span>
                </div>
              )}
              {settings.phone && (
                <div className="flex items-center gap-2 bg-secondary/40 rounded-lg px-3 py-2">
                  <Phone className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="text-xs text-foreground truncate">{settings.phone}</span>
                </div>
              )}
              {settings.email && (
                <div className="flex items-center gap-2 bg-secondary/40 rounded-lg px-3 py-2">
                  <Mail className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="text-xs text-foreground truncate">{settings.email}</span>
                </div>
              )}
              {settings.website && (
                <div className="flex items-center gap-2 bg-secondary/40 rounded-lg px-3 py-2">
                  <Globe className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="text-xs text-foreground truncate">{settings.website}</span>
                </div>
              )}
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
          <CreditAlerts />
          <DeliveryAlerts repairs={repairs} />
          <LowStockAlert products={lowStockProducts} />
          <RecentActivity repairs={repairs} sales={sales} />
        </div>
      </div>
    </div>
  );
}