import { Wrench, ShoppingCart } from 'lucide-react';
import StatusBadge from '../StatusBadge';

export default function RecentActivity({ repairs, sales }) {
  const activities = [
    ...repairs.slice(-5).map(r => ({
      type: 'repair',
      title: r.machine_name || 'Reparación',
      subtitle: r.customer_name || '',
      status: r.status,
      date: r.date,
    })),
    ...sales.slice(-5).map(s => ({
      type: 'sale',
      title: `Venta #${s.order_number || s.id?.substring(0, 6)}`,
      subtitle: s.customer_name || '',
      status: s.status,
      date: s.date,
    })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Actividad Reciente</h3>
      <div className="space-y-3">
        {activities.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Sin actividad reciente</p>
        )}
        {activities.map((a, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              a.type === 'repair' ? 'bg-primary/10' : 'bg-accent/10'
            }`}>
              {a.type === 'repair' 
                ? <Wrench className="h-3.5 w-3.5 text-primary" /> 
                : <ShoppingCart className="h-3.5 w-3.5 text-accent" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{a.title}</p>
              <p className="text-[11px] text-muted-foreground truncate">{a.subtitle}</p>
            </div>
            <StatusBadge status={a.status} />
          </div>
        ))}
      </div>
    </div>
  );
}