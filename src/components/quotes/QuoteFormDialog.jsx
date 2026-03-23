import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from 'lucide-react';
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';

export default function QuoteFormDialog({ open, onOpenChange, customers, machines, onSaved }) {
  const [form, setForm] = useState({
    customer_id: '', machine_id: '',
    date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    type: 'venta',
    items: [{ description: '', quantity: 1, unit_price: 0 }],
    labor_cost: 0, discount: 0, notes: '', status: 'pendiente'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        customer_id: '', machine_id: '',
        date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        type: 'venta',
        items: [{ description: '', quantity: 1, unit_price: 0 }],
        labor_cost: 0, discount: 0, notes: '', status: 'pendiente'
      });
    }
  }, [open]);

  const subtotal = form.items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
  const total = subtotal + (Number(form.labor_cost) || 0) - (Number(form.discount) || 0);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unit_price: 0 }] }));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx, field, value) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...f, items };
    });
  };

  const customerMachines = machines.filter(m => !form.customer_id || m.customer_id === form.customer_id);

  const handleSave = async () => {
    if (!form.customer_id) { toast.error('Selecciona un cliente'); return; }
    setSaving(true);
    const customer = customers.find(c => c.id === form.customer_id);
    const machine = machines.find(m => m.id === form.machine_id);
    await base44.entities.Quote.create({
      ...form,
      customer_name: customer?.name || '',
      machine_name: machine?.name || '',
      total,
      quote_number: `CT-${Date.now().toString().slice(-6)}`,
    });
    toast.success('Cotización creada');
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle>Nueva Cotización</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <Label>Cliente *</Label>
            <Select value={form.customer_id} onValueChange={v => setForm(f => ({ ...f, customer_id: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de cotización</Label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="venta">Venta de productos</SelectItem>
                <SelectItem value="reparacion">Reparación / Servicio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.type === 'reparacion' && (
            <div className="sm:col-span-2">
              <Label>Equipo (opcional)</Label>
              <Select value={form.machine_id} onValueChange={v => setForm(f => ({ ...f, machine_id: v }))}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Seleccionar equipo" /></SelectTrigger>
                <SelectContent>{customerMachines.map(m => <SelectItem key={m.id} value={m.id}>{m.name} {m.brand ? `- ${m.brand}` : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-secondary border-border" />
          </div>
          <div>
            <Label>Válida hasta</Label>
            <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className="bg-secondary border-border" />
          </div>
        </div>

        {/* Items */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Ítems / Productos</Label>
            <Button variant="outline" size="sm" onClick={addItem} className="gap-1 text-xs">
              <Plus className="h-3 w-3" /> Agregar
            </Button>
          </div>
          <div className="space-y-2">
            {form.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={item.description}
                  onChange={e => updateItem(idx, 'description', e.target.value)}
                  className="bg-secondary border-border flex-1"
                  placeholder="Descripción del ítem"
                />
                <Input
                  type="number" min="1" value={item.quantity}
                  onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                  className="w-20 bg-secondary border-border"
                  placeholder="Cant"
                />
                <Input
                  type="number" value={item.unit_price}
                  onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
                  className="w-28 bg-secondary border-border"
                  placeholder="Precio"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <Label>Mano de obra</Label>
            <Input type="number" value={form.labor_cost} onChange={e => setForm(f => ({ ...f, labor_cost: Number(e.target.value) }))} className="bg-secondary border-border" />
          </div>
          <div>
            <Label>Descuento</Label>
            <Input type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: Number(e.target.value) }))} className="bg-secondary border-border" />
          </div>
          <div className="bg-primary/10 rounded-lg p-3 text-center flex flex-col justify-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold text-primary">${total.toLocaleString('es-CL')}</p>
          </div>
        </div>

        <div className="mt-4">
          <Label>Notas / Condiciones</Label>
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-secondary border-border" rows={2} placeholder="Garantía, tiempo de entrega, condiciones..." />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Crear Cotización'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}