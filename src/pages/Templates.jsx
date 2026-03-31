import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { FileCheck, Plus, Pencil, Trash2, Download, Package, Users, Monitor, FileSpreadsheet } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { toast } from "sonner";

const typeLabels = { repair: 'Reparación', sale: 'Venta', inventory: 'Inventario', financial: 'Financiero', custom: 'Personalizado' };

const IMPORT_TEMPLATES = [
  {
    id: 'products',
    label: 'Inventario — Productos',
    module: 'Inventario',
    icon: Package,
    color: 'bg-primary/10 text-primary',
    description: 'Carga masiva de productos y repuestos al inventario.',
    columns: [
      { key: 'nombre', required: true, example: 'Filtro de aceite', desc: 'Nombre del producto' },
      { key: 'codigo', required: true, example: 'FILT-001', desc: 'Código único del producto' },
      { key: 'stock', required: false, example: '50', desc: 'Cantidad disponible' },
      { key: 'stock_minimo', required: false, example: '5', desc: 'Alerta de stock bajo' },
      { key: 'precio_compra', required: false, example: '3500', desc: 'Precio de compra (sin puntos ni $)' },
      { key: 'precio_venta', required: false, example: '6000', desc: 'Precio de venta (sin puntos ni $)' },
      { key: 'categoria', required: false, example: 'Filtros', desc: 'Categoría del producto' },
      { key: 'descripcion', required: false, example: 'Filtro para motor diesel', desc: 'Descripción adicional' },
    ],
    filename: 'plantilla_productos',
  },
  {
    id: 'customers',
    label: 'Clientes',
    module: 'Clientes',
    icon: Users,
    color: 'bg-accent/10 text-accent',
    description: 'Carga masiva de clientes con sus datos de contacto.',
    columns: [
      { key: 'nombre', required: true, example: 'Juan Pérez', desc: 'Nombre completo del cliente' },
      { key: 'email', required: false, example: 'juan@gmail.com', desc: 'Correo electrónico' },
      { key: 'telefono', required: false, example: '+56912345678', desc: 'Número de teléfono' },
      { key: 'direccion', required: false, example: 'Av. Libertad 123', desc: 'Dirección del cliente' },
      { key: 'notas', required: false, example: 'Cliente frecuente', desc: 'Notas o comentarios' },
    ],
    filename: 'plantilla_clientes',
  },
  {
    id: 'machines',
    label: 'Equipos',
    module: 'Equipos',
    icon: Monitor,
    color: 'bg-warning/10 text-warning',
    description: 'Carga masiva de equipos o máquinas registradas.',
    columns: [
      { key: 'nombre', required: true, example: 'Compresor Industrial', desc: 'Nombre del equipo' },
      { key: 'marca', required: false, example: 'Atlas Copco', desc: 'Marca del equipo' },
      { key: 'modelo', required: false, example: 'GA15', desc: 'Modelo del equipo' },
      { key: 'numero_serie', required: false, example: 'SN-2023-001', desc: 'Número de serie' },
      { key: 'nombre_cliente', required: false, example: 'Juan Pérez', desc: 'Nombre exacto del cliente dueño' },
      { key: 'notas', required: false, example: 'Revisión mensual', desc: 'Notas o comentarios' },
    ],
    filename: 'plantilla_equipos',
  },
];

function downloadBulkTemplate(tpl) {
  const headers = tpl.columns.map(c => c.key);
  const example = tpl.columns.map(c => c.example);
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tpl.filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`Plantilla ${tpl.label} descargada`);
}

function ImportTemplateCard({ tpl }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = tpl.icon;
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all">
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${tpl.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">{tpl.label}</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Módulo: {tpl.module}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs text-primary hover:underline mb-3 flex items-center gap-1"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          {expanded ? 'Ocultar columnas' : 'Ver columnas del formato'}
        </button>

        {expanded && (
          <div className="mb-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-secondary">
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Columna</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Ejemplo</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Descripción</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">¿Obligatorio?</th>
                </tr>
              </thead>
              <tbody>
                {tpl.columns.map(col => (
                  <tr key={col.key} className="border-t border-border">
                    <td className="px-3 py-2 font-mono font-semibold text-foreground whitespace-nowrap">{col.key}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{col.example}</td>
                    <td className="px-3 py-2 text-muted-foreground">{col.desc}</td>
                    <td className="px-3 py-2">
                      {col.required
                        ? <span className="text-destructive font-semibold">Sí</span>
                        : <span className="text-muted-foreground">No</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Button onClick={() => downloadBulkTemplate(tpl)} variant="outline" className="gap-2 w-full">
          <Download className="h-4 w-4" /> Descargar plantilla Excel
        </Button>
      </div>
    </div>
  );
}

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({
    name: '', type: 'repair', header_text: '', footer_text: '',
    include_logo: true, include_company_info: true, content_template: ''
  });

  async function load() {
    const t = await base44.entities.ReportTemplate.list();
    setTemplates(t);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (editTemplate) {
      setForm({
        name: editTemplate.name || '', type: editTemplate.type || 'repair',
        header_text: editTemplate.header_text || '', footer_text: editTemplate.footer_text || '',
        include_logo: editTemplate.include_logo !== false, include_company_info: editTemplate.include_company_info !== false,
        content_template: editTemplate.content_template || '',
      });
    } else {
      setForm({ name: '', type: 'repair', header_text: '', footer_text: '', include_logo: true, include_company_info: true, content_template: '' });
    }
  }, [editTemplate, formOpen]);

  const handleSave = async () => {
    if (!form.name) { toast.error('El nombre es obligatorio'); return; }
    if (editTemplate) {
      await base44.entities.ReportTemplate.update(editTemplate.id, form);
      toast.success('Plantilla actualizada');
    } else {
      await base44.entities.ReportTemplate.create(form);
      toast.success('Plantilla creada');
    }
    setFormOpen(false); setEditTemplate(null); load();
  };

  const handleDelete = async () => {
    await base44.entities.ReportTemplate.delete(deleteId);
    setDeleteId(null);
    toast.success('Plantilla eliminada');
    load();
  };

  const [activeTab, setActiveTab] = useState('import');

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <PageHeader title="Plantillas" description="Plantillas de carga masiva e informes">
        {activeTab === 'reports' && (
          <Button onClick={() => { setEditTemplate(null); setFormOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nueva Plantilla
          </Button>
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'import' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Plantillas de Carga Masiva
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'reports' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Plantillas de Informes
        </button>
      </div>

      {/* Import Templates Tab */}
      {activeTab === 'import' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Descarga la plantilla del módulo que necesitas, réllala en Excel y luego úsala en el botón <strong>"Carga masiva"</strong> de cada sección.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {IMPORT_TEMPLATES.map(tpl => <ImportTemplateCard key={tpl.id} tpl={tpl} />)}
          </div>
        </div>
      )}

      {/* Report Templates Tab */}
      {activeTab === 'reports' && (
        <>
          {templates.length === 0 ? (
            <EmptyState icon={FileCheck} title="Sin plantillas" description="Crea tu primera plantilla de informe" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(t => (
                <div key={t.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileCheck className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditTemplate(t); setFormOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{t.name}</h3>
                  <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    {typeLabels[t.type] || t.type}
                  </span>
                  {t.header_text && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{t.header_text}</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditTemplate(null); }}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader><DialogTitle>{editTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Nombre *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-secondary border-border" /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Texto de encabezado</Label><Input value={form.header_text} onChange={e => setForm(f => ({ ...f, header_text: e.target.value }))} className="bg-secondary border-border" /></div>
            <div><Label>Texto de pie de página</Label><Input value={form.footer_text} onChange={e => setForm(f => ({ ...f, footer_text: e.target.value }))} className="bg-secondary border-border" /></div>
            <div className="flex items-center justify-between">
              <Label>Incluir logo</Label>
              <Switch checked={form.include_logo} onCheckedChange={v => setForm(f => ({ ...f, include_logo: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Incluir info de empresa</Label>
              <Switch checked={form.include_company_info} onCheckedChange={v => setForm(f => ({ ...f, include_company_info: v }))} />
            </div>
            <div><Label>Contenido de la plantilla</Label><Textarea value={form.content_template} onChange={e => setForm(f => ({ ...f, content_template: e.target.value }))} className="bg-secondary border-border" rows={4} placeholder="Texto adicional para incluir en el informe..." /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setFormOpen(false); setEditTemplate(null); }}>Cancelar</Button>
            <Button onClick={handleSave}>{editTemplate ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}