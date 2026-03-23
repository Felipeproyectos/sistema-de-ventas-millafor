import { AlertTriangle } from 'lucide-react';

export default function LowStockAlert({ products }) {
  if (products.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Stock</h3>
        <p className="text-xs text-accent flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" /> Todos los productos con stock suficiente
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-warning/20 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <h3 className="text-sm font-semibold text-warning">Stock Bajo</h3>
      </div>
      <div className="space-y-2">
        {products.slice(0, 5).map(p => (
          <div key={p.id} className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground">{p.name}</p>
              <p className="text-[11px] text-muted-foreground">{p.code}</p>
            </div>
            <span className="text-xs font-bold text-warning">{p.stock || 0} uds</span>
          </div>
        ))}
      </div>
    </div>
  );
}