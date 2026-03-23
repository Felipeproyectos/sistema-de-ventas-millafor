import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileCheck, Plus, Pencil, Trash2 } from 'lucide-react';
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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <PageHeader title="Plantillas de Informes" description="Crea y edita plantillas para generar documentos">
        <Button onClick={() => { setEditTemplate(null); setFormOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Nueva Plantilla
        </Button>
      </PageHeader>

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