import { AlertTriangle, Clock } from 'lucide-react';

export default function DeliveryAlerts({ repairs }) {
  const today = new Date().toISOString().split('T')[0];

  const alerts = repairs
    .filter(r => r.delivery_date && r.status !== 'finalizada')
    .map(r => ({ ...r, isOverdue: r.delivery_date < today, isToday: r.delivery_date === today }))
    .filter(r => r.isOverdue || r.isToday)
    .sort((a, b) => a.delivery_date.localeCompare(b.delivery_date));

  if (alerts.length === 0) return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">Plazos de Entrega</h3>
      </div>
      <p className="text-xs text-muted-foreground">No hay reparaciones con plazo vencido o próximo.</p>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <h3 className="text-sm font-semibold text-foreground">Plazos de Entrega</h3>
        <span className="ml-auto text-xs font-bold bg-warning/20 text-warning px-2 py-0.5 rounded-full">{alerts.length}</span>
      </div>
      <div className="space-y-2">
        {alerts.map(r => (
          <div key={r.id} className={`rounded-lg px-3 py-2 border text-xs ${r.isOverdue ? 'bg-destructive/10 border-destructive/30' : 'bg-warning/10 border-warning/30'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-foreground truncate">{r.customer_name || 'Cliente'}</span>
              <span className={`font-bold flex-shrink-0 ${r.isOverdue ? 'text-destructive' : 'text-warning'}`}>
                {r.isOverdue ? '⚠ Vencida' : '⏰ Hoy'}
              </span>
            </div>
            <div className="flex items-center justify-between mt-0.5 text-muted-foreground">
              <span>{r.machine_name || r.problem_description?.slice(0, 30) || 'Sin descripción'}</span>
              <span className="flex-shrink-0">{r.delivery_date}</span>
            </div>
            <span className="text-[10px] uppercase font-medium mt-1 inline-block opacity-60">#{r.order_number || r.id?.slice(0, 6)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}