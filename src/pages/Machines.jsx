import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Monitor, Plus, Search, Pencil, Trash2, Upload } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import BulkImportModal from '../components/BulkImportModal';
import { toast } from "sonner";

export default function Machines() {
  const [machines, setMachines] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editMachine, setEditMachine] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: '', brand: '', model: '', serial_number: '', customer_id: '', notes: '' });
  const [bulkOpen, setBulkOpen] = useState(false);

  async function load() {
    const [m, c] = await Promise.all([base44.entities.Machine.list(), base44.entities.Customer.list()]);
    setMachines(m); setCustomers(c); setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (editMachine) {
      setForm({ name: editMachine.name || '', brand: editMachine.brand || '', model: editMachine.model || '', serial_number: editMachine.serial_number || '', customer_id: editMachine.customer_id || '', notes: editMachine.notes || '' });
    } else {
      setForm({ name: '', brand: '', model: '', serial_number: '', customer_id: '', notes: '' });
    }
  }, [editMachine, formOpen]);

  const handleSave = async () => {
    if (!form.name) { toast.error('El nombre es obligatorio'); return; }
    if (editMachine) {
      await base44.entities.Machine.update(editMachine.id, form);
      toast.success('Equipo actualizado');
    } else {
      await base44.entities.Machine.create(form);
      toast.success('Equipo creado');
    }
    setFormOpen(false); setEditMachine(null); load();
  };

  const handleDelete = async () => {
    await base44.entities.Machine.delete(deleteId);
    setDeleteId(null);
    toast.success('Equipo eliminado');
    load();
  };

  const getCustomerName = (id) => customers.find(c => c.id === id)?.name || '-';

  const filtered = machines.filter(m =>
    !search || m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.brand?.toLowerCase().includes(search.toLowerCase()) ||
    m.serial_number?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <PageHeader title="Equipos" description="Gestión de máquinas y equipos">
        <Button variant="outline" onClick={() => setBulkOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" /> Carga masiva
        </Button>
        <Button onClick={() => { setEditMachine(null); setFormOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo Equipo
        </Button>
      </PageHeader>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar equipo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Monitor} title="Sin equipos" description="Agrega tu primer equipo" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Equipo</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Marca / Modelo</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">N° Serie</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-medium">{m.name}</td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">{[m.brand, m.model].filter(Boolean).join(' / ') || '-'}</td>
                    <td className="p-4 text-muted-foreground hidden lg:table-cell">{m.serial_number || '-'}</td>
                    <td className="p-4 text-muted-foreground">{getCustomerName(m.customer_id)}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditMachine(m); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(m.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditMachine(null); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{editMachine ? 'Editar Equipo' : 'Nuevo Equipo'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div><Label>Nombre *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-secondary border-border" /></div>
            <div><Label>Marca</Label><Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} className="bg-secondary border-border" /></div>
            <div><Label>Modelo</Label><Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} className="bg-secondary border-border" /></div>
            <div><Label>N° Serie</Label><Input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} className="bg-secondary border-border" /></div>
            <div className="col-span-2">
              <Label>Cliente</Label>
              <Select value={form.customer_id} onValueChange={v => setForm(f => ({ ...f, customer_id: v }))}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Notas</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-secondary border-border" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setFormOpen(false); setEditMachine(null); }}>Cancelar</Button>
            <Button onClick={handleSave}>{editMachine ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar equipo?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkImportModal
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        entityType="machines"
        customers={customers}
        onSuccess={load}
      />
    </div>
  );
}