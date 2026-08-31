import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Database, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ENTITIES_TO_BACKUP = [
  'Customer', 'Machine', 'Product', 'RepairOrder', 'SaleOrder', 'Quote',
  'CreditSale', 'WarrantyOrder', 'InventoryMovement', 'CompanySettings',
  'ReportTemplate', 'DriveConfig', 'AccessRequest',
];

export default function BackupButton() {
  const [backing, setBacking] = useState(false);

  const handleBackup = async () => {
    setBacking(true);
    try {
      const backup = {};
      for (const name of ENTITIES_TO_BACKUP) {
        try {
          const records = await base44.entities[name].list('-created_date', 10000);
          backup[name] = records;
        } catch (err) {
          console.warn(`No se pudo respaldar ${name}`, err);
          backup[name] = [];
        }
      }

      const payload = {
        _meta: {
          app: 'SISTEMA DE VENTAS MILLAFOR',
          exported_at: new Date().toISOString(),
          entity_count: Object.keys(backup).length,
          record_count: Object.values(backup).reduce((s, arr) => s + (arr?.length || 0), 0),
        },
        data: backup,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = `respaldo-millafor-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const total = payload._meta.record_count;
      toast.success(`Respaldo descargado (${total} registros)`);
    } catch (err) {
      console.error(err);
      toast.error('Error al generar respaldo');
    } finally {
      setBacking(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Database className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">Respaldo del Sistema</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Descarga un archivo JSON con todos los registros del sistema (clientes, órdenes, inventario, créditos, etc.).
          </p>
        </div>
      </div>
      <button
        onClick={handleBackup}
        disabled={backing}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {backing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
        {backing ? 'Generando respaldo...' : 'Descargar respaldo completo'}
      </button>
    </div>
  );
}