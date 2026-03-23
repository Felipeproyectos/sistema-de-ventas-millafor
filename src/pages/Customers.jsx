import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Plus, Search, Pencil, Trash2, Upload } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import BulkImportModal from '../components/BulkImportModal';
import { toast } from "sonner";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' });
  const [showMachineForm, setShowMachineForm] = useState(false);
  const [machineForm, setMachineForm] = useState({ name: '', brand: '', model: '', type: '', serial_number: '' });
  const [bulkOpen, setBulkOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameRef = useRef(null);

  async function load() {
    const c = await base44.entities.Customer.list();
    setCustomers(c);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (editCustomer) {
      setForm({ name: editCustomer.name || '', email: editCustomer.email || '', phone: editCustomer.phone || '', address: editCustomer.address || '', notes: editCustomer.notes || '' });
    } else {
      setForm({ name: '', email: '', phone: '', address: '', notes: '' });
      setShowMachineForm(false);
      setMachineForm({ name: '', brand: '', model: '', type: '', serial_number: '' });
    }
  }, [editCustomer, formOpen];

  const handleNameChange = (value) => {
    setForm(f => ({ ...f, name: value }));
    if (!editCustomer && value.trim().length >= 2) {
      const matches = customers.filter(c =>
        c.name?.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const applySuggestion = (customer) => {
    setForm({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setShowSuggestions(false);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('El nombre es obligatorio'); return; }
    if (editCustomer) {
      await base44.entities.Customer.update(editCustomer.id, form);
      toast.success('Cliente actualizado');
    } else {
      const created = await base44.entities.Customer.create(form);
      if (showMachineForm && machineForm.name) {
        await base44.entities.Machine.create({
          ...machineForm,
          customer_id: created.id
        });
      }
      toast.success(showMachineForm && machineForm.name ? 'Cliente y equipo creados' : 'Cliente creado');
    }
    setFormOpen(false); setEditCustomer(null); load();
  };

  const handleDelete = async () => {
    await base44.entities.Customer.delete(deleteId);
    setDeleteId(null);
    toast.success('Cliente eliminado');
    load();
  };

  const filtered = customers.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <PageHeader title="Clientes" description="Gestión de clientes">
        <Button variant="outline" onClick={() => setBulkOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" /> Carga masiva
        </Button>
        <Button onClick={() => { setEditCustomer(null); setFormOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo Cliente
        </Button>
      </PageHeader>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Sin clientes" description="Agrega tu primer cliente" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between mb-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {c.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditCustomer(c); setFormOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
              {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
              {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
              {c.address && <p className="text-xs text-muted-foreground mt-1">{c.address}</p>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditCustomer(null); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{editCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="relative">
              <Label>Nombre *</Label>
              <Input
                ref={nameRef}
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                className="bg-secondary border-border"
                placeholder="Escribe el nombre del cliente..."
              />
              {showSuggestions && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
                  <p className="text-[10px] text-muted-foreground px-3 pt-2 pb-1 uppercase font-semibold">Clientes existentes</p>
                  {suggestions.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => applySuggestion(s)}
                      className="w-full text-left px-3 py-2 hover:bg-secondary transition-colors"
                    >
                      <p className="text-sm font-medium text-foreground">{s.name}</p>
                      {(s.email || s.phone) && (
                        <p className="text-xs text-muted-foreground">{[s.email, s.phone].filter(Boolean).join(' · ')}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-secondary border-border" /></div>
              <div><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-secondary border-border" /></div>
            </div>
            <div><Label>Dirección</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="bg-secondary border-border" /></div>
            <div><Label>Notas</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-secondary border-border" /></div>
            {!editCustomer && (
              <div className="border-t pt-4 mt-4">
                <button type="button" onClick={() => setShowMachineForm(!showMachineForm)} className="text-sm text-primary font-medium mb-3">
                  {showMachineForm ? '✕ Cancelar crear equipo' : '+ Crear equipo simultáneamente'}
                </button>
                {showMachineForm && (
                  <div className="space-y-3 bg-secondary/20 p-3 rounded-lg">
                    <div><Label className="text-xs">Nombre equipo</Label><Input value={machineForm.name} onChange={e => setMachineForm(m => ({ ...m, name: e.target.value }))} className="bg-secondary border-border text-sm" /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">Marca</Label><Input value={machineForm.brand} onChange={e => setMachineForm(m => ({ ...m, brand: e.target.value }))} className="bg-secondary border-border text-sm" /></div>
                      <div><Label className="text-xs">Modelo</Label><Input value={machineForm.model} onChange={e => setMachineForm(m => ({ ...m, model: e.target.value }))} className="bg-secondary border-border text-sm" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">Tipo</Label><Input value={machineForm.type} onChange={e => setMachineForm(m => ({ ...m, type: e.target.value }))} className="bg-secondary border-border text-sm" /></div>
                      <div><Label className="text-xs">N° de serie</Label><Input value={machineForm.serial_number} onChange={e => setMachineForm(m => ({ ...m, serial_number: e.target.value }))} className="bg-secondary border-border text-sm" /></div>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setFormOpen(false); setEditCustomer(null); }}>Cancelar</Button>
            <Button onClick={handleSave}>{editCustomer ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
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
        entityType="customers"
        onSuccess={load}
      />
    </div>
  );
}