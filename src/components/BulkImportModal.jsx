import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { Upload, Download, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import { toast } from "sonner";

const CONFIGS = {
  products: {
    label: 'Productos (Inventario)',
    columns: [
      { key: 'nombre', label: 'nombre', required: true, example: 'Filtro de aceite' },
      { key: 'codigo', label: 'codigo', required: true, example: 'FILT-001' },
      { key: 'stock', label: 'stock', required: false, example: '50' },
      { key: 'stock_minimo', label: 'stock_minimo', required: false, example: '5' },
      { key: 'precio_compra', label: 'precio_compra', required: false, example: '3500' },
      { key: 'precio_venta', label: 'precio_venta', required: false, example: '6000' },
      { key: 'categoria', label: 'categoria', required: false, example: 'Filtros' },
      { key: 'descripcion', label: 'descripcion', required: false, example: 'Filtro para motor diesel' },
    ],
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              nombre: { type: 'string' },
              codigo: { type: 'string' },
              stock: { type: 'number' },
              stock_minimo: { type: 'number' },
              precio_compra: { type: 'number' },
              precio_venta: { type: 'number' },
              categoria: { type: 'string' },
              descripcion: { type: 'string' },
            }
          }
        }
      }
    },
    mapRow: (row) => ({
      name: row.nombre || '',
      code: row.codigo || '',
      stock: Number(row.stock) || 0,
      min_stock: Number(row.stock_minimo) || 5,
      purchase_price: Number(row.precio_compra) || 0,
      sale_price: Number(row.precio_venta) || 0,
      category: row.categoria || '',
      description: row.descripcion || '',
    }),
    validate: (row) => row.nombre && row.codigo,
    entity: 'Product',
  },
  customers: {
    label: 'Clientes',
    columns: [
      { key: 'nombre', label: 'nombre', required: true, example: 'Juan Pérez' },
      { key: 'email', label: 'email', required: false, example: 'juan@gmail.com' },
      { key: 'telefono', label: 'telefono', required: false, example: '+56912345678' },
      { key: 'direccion', label: 'direccion', required: false, example: 'Av. Libertad 123' },
      { key: 'notas', label: 'notas', required: false, example: 'Cliente frecuente' },
    ],
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              nombre: { type: 'string' },
              email: { type: 'string' },
              telefono: { type: 'string' },
              direccion: { type: 'string' },
              notas: { type: 'string' },
            }
          }
        }
      }
    },
    mapRow: (row) => ({
      name: row.nombre || '',
      email: row.email || '',
      phone: row.telefono || '',
      address: row.direccion || '',
      notes: row.notas || '',
    }),
    validate: (row) => row.nombre,
    entity: 'Customer',
  },
  machines: {
    label: 'Equipos',
    columns: [
      { key: 'nombre', label: 'nombre', required: true, example: 'Compresor Industrial' },
      { key: 'marca', label: 'marca', required: false, example: 'Atlas Copco' },
      { key: 'modelo', label: 'modelo', required: false, example: 'GA15' },
      { key: 'numero_serie', label: 'numero_serie', required: false, example: 'SN-2023-001' },
      { key: 'nombre_cliente', label: 'nombre_cliente', required: false, example: 'Juan Pérez' },
      { key: 'notas', label: 'notas', required: false, example: 'Requiere mantención mensual' },
    ],
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              nombre: { type: 'string' },
              marca: { type: 'string' },
              modelo: { type: 'string' },
              numero_serie: { type: 'string' },
              nombre_cliente: { type: 'string' },
              notas: { type: 'string' },
            }
          }
        }
      }
    },
    mapRow: (row, customers = []) => {
      const customer = customers.find(c => c.name?.toLowerCase() === (row.nombre_cliente || '').toLowerCase());
      return {
        name: row.nombre || '',
        brand: row.marca || '',
        model: row.modelo || '',
        serial_number: row.numero_serie || '',
        customer_id: customer?.id || '',
        notes: row.notas || '',
      };
    },
    validate: (row) => row.nombre,
    entity: 'Machine',
  },
};

function downloadTemplate(config) {
  const headers = config.columns.map(c => c.key);
  const example = config.columns.map(c => c.example);
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
  XLSX.writeFile(wb, `plantilla_${config.entity.toLowerCase()}.xlsx`);
}

export default function BulkImportModal({ open, onOpenChange, entityType, customers = [], onSuccess }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [results, setResults] = useState({ success: 0, failed: 0, errors: [] });

  const config = CONFIGS[entityType];
  if (!config) return null;

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  };

  const handleImport = async () => {
    if (!file) { toast.error('Selecciona un archivo primero'); return; }
    setStatus('loading');
    setResults({ success: 0, failed: 0, errors: [] });

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: config.schema,
    });

    if (extracted.status !== 'success') {
      setStatus('error');
      setResults({ success: 0, failed: 0, errors: ['No se pudo leer el archivo. Verifica el formato.'] });
      return;
    }

    const rows = extracted.output?.items || (Array.isArray(extracted.output) ? extracted.output : []);
    let success = 0;
    const errors = [];

    for (const row of rows) {
      if (!config.validate(row)) {
        errors.push(`Fila inválida: falta campo obligatorio (${config.columns.find(c => c.required)?.key})`);
        continue;
      }
      const mapped = config.mapRow(row, customers);
      await base44.entities[config.entity].create(mapped);
      success++;
    }

    setResults({ success, failed: errors.length, errors });
    setStatus('done');
    if (success > 0) {
      toast.success(`${success} registros importados correctamente`);
      onSuccess?.();
    }
  };

  const handleClose = (v) => {
    if (!v) { setFile(null); setStatus('idle'); setResults({ success: 0, failed: 0, errors: [] }); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Carga Masiva — {config.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Format reference */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Formato requerido del archivo</p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary">
                    {config.columns.map(col => (
                      <th key={col.key} className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">
                        {col.key}
                        {col.required && <span className="text-destructive ml-0.5">*</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {config.columns.map(col => (
                      <td key={col.key} className="px-3 py-2 text-muted-foreground whitespace-nowrap border-t border-border">
                        {col.example}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              <span className="text-destructive">*</span> Campos obligatorios. Las columnas deben tener exactamente estos nombres en la primera fila.
            </p>
          </div>

          {/* Download template */}
          <Button variant="outline" className="gap-2 w-full" onClick={() => downloadTemplate(config)}>
            <Download className="h-4 w-4" /> Descargar plantilla CSV (abrir con Excel)
          </Button>

          {/* File upload */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Subir archivo</p>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-all">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-foreground font-medium">
                {file ? file.name : 'Haz clic para seleccionar archivo'}
              </span>
              <span className="text-xs text-muted-foreground">Formatos soportados: .xlsx, .csv</span>
              <input type="file" accept=".xlsx,.csv,.xls" className="hidden" onChange={handleFile} />
            </label>
          </div>

          {/* Results */}
          {status === 'done' && (
            <div className="space-y-2">
              <div className="flex gap-3">
                <div className="flex items-center gap-2 bg-accent/10 text-accent rounded-lg px-3 py-2 text-sm flex-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-semibold">{results.success}</span> importados
                </div>
                {results.failed > 0 && (
                  <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm flex-1">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-semibold">{results.failed}</span> fallidos
                  </div>
                )}
              </div>
              {results.errors.length > 0 && (
                <div className="bg-destructive/5 rounded-lg p-3 text-xs text-destructive space-y-1 max-h-28 overflow-y-auto">
                  {results.errors.map((e, i) => <p key={i}>• {e}</p>)}
                </div>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">
              <AlertCircle className="h-4 w-4" /> {results.errors[0]}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleClose(false)}>Cerrar</Button>
            <Button onClick={handleImport} disabled={!file || status === 'loading'} className="gap-2">
              {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {status === 'loading' ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}