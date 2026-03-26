import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Clock, CreditCard } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export default function CreditAlerts() {
  const { data: credits = [] } = useQuery({
    queryKey: ['credits'],
    queryFn: () => base44.entities.CreditSale.list(),
    staleTime: 1000 * 60 * 5
  });

  const today = new Date();
  const active = credits.filter(c => c.status !== 'pagado');
  const overdue = active.filter(c => differenceInDays(parseISO(c.due_date), today) < 0);
  const nearDue = active.filter(c => { const d = differenceInDays(parseISO(c.due_date), today); return d >= 0 && d <= 7; });

  if (overdue.length === 0 && nearDue.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <CreditCard className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Alertas de Crédito</span>
      </div>
      <div className="divide-y divide-border">
        {overdue.map(c => (
          <Link key={c.id} to="/credit" className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
            <div className="h-7 w-7 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{c.client_name}</p>
              <p className="text-xs text-muted-foreground truncate">{c.description}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-bold text-destructive">Vencido</p>
              <p className="text-[10px] text-muted-foreground">${((c.total_amount || 0) - (c.amount_paid || 0)).toLocaleString('es-CL')}</p>
            </div>
          </Link>
        ))}
        {nearDue.map(c => {
          const days = differenceInDays(parseISO(c.due_date), today);
          return (
            <Link key={c.id} to="/credit" className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
              <div className="h-7 w-7 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                <Clock className="h-3.5 w-3.5 text-yellow-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{c.client_name}</p>
                <p className="text-xs text-muted-foreground truncate">{c.description}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-yellow-600">Vence en {days}d</p>
                <p className="text-[10px] text-muted-foreground">${((c.total_amount || 0) - (c.amount_paid || 0)).toLocaleString('es-CL')}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}