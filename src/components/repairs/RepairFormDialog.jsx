import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from 'lucide-react';
import { toast } from "sonner";

export default function RepairFormDialog({ open, onOpenChange, repair, customers, machines, products, onSaved }) {
  const [form, setForm] = useState({
    customer_id: '', machine_id: '', date: new Date().toISOString().split('T')[0],
    problem_description: '', solution_description: '', status: 'pendiente',
    parts_used: [], labor_cost: 0, notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (repair) {
      setForm({
        customer_id: repair.customer_id || '',
        machine_id: repair.machine_id || '',
        date: repair.date || new Date().toISOString().split('T')[0],
        problem_description: repair.problem_description || '',
        solution_description: repair.solution_description || '',
        status: repair.status || 'pendiente',
        parts_used: repair.parts_used || [],
        labor_cost: repair.labor_cost || 0,
        notes: repair.notes || '',
      });
    } else {
      setForm({
        customer_id: '', machine_id: '', date: new Date().toISOString().split('T')[0],
        problem_description: '', solution_description: '', status: 'pendiente',
        parts_used: [], labor_cost: 0, notes: ''
      });
    }
  }, [repair, open]);

  const addPart = () => {
    setForm(f => ({ ...f, parts_used: [...f.parts_used, { product_id: '', product_name: '', quantity: 1, unit_price: 0 }] }));
  };

  const updatePart = (idx, field, value) => {
    setForm(f => {
      const parts = [...f.parts_used];
      parts[idx] = { ...parts[idx], [field]: value };
      if (field === 'product_id') {
        const prod = products.find(p => p.id === value);
        if (prod) {
          parts[idx].product_name = prod.name;
          parts[idx].unit_price = prod.sale_price || 0;
        }
      }
      return { ...f, parts_used: parts };
    });
  };

  const removePart = (idx) => {
    setForm(f => ({ ...f, parts_used: f.parts_used.filter((_, i) => i !== idx) }));
  };

  const partsTotal = form.parts_used.reduce((s, p) => s + (p.quantity || 0) * (p.unit_price || 0), 0);
  const total = partsTotal + (Number(form.labor_cost) || 0);

  const customerMachines = machines.filter(m => !form.customer_id || m.customer_id === form.customer_id);

  const handleSave = async () => {
    if (!form.customer_id || !form.machine_id) {
      toast.error('Selecciona un cliente y equipo');
      return;
    }
    setSaving(true);

    const customer = customers.find(c => c.id === form.customer_id);
    const machine = machines.find(m => m.id === form.machine_id);

    const data = {
      ...form,
      customer_name: customer?.name || '',
      machine_name: machine?.name || '',
      total,
      order_number: repair?.order_number || `OR-${Date.now().toString().slice(-6)}`,
    };

    // Stock deduction for new parts
    if (!repair) {
      for (const part of form.parts_used) {
        if (part.product_id && part.quantity > 0) {
          const prod = products.find(p => p.id === part.product_id);
          if (prod) {
            await base44.entities.Product.update(prod.id, { stock: Math.max(0, (prod.stock || 0) - part.quantity) });
          }
        }
      }
    } else {
      // Handle stock changes for edits
      const oldParts = repair.parts_used || [];
      for (const newPart of form.parts_used) {
        if (!newPart.product_id) continue;
        const oldPart = oldParts.find(op => op.product_id === newPart.product_id);
        const oldQty = oldPart ? oldPart.quantity : 0;
        const diff = (newPart.quantity || 0) - oldQty;
        if (diff !== 0) {
          const prod = products.find(p => p.id === newPart.product_id);
          if (prod) {
            await base44.entities.Product.update(prod.id, { stock: Math.max(0, (prod.stock || 0) - diff) });
          }
        }
      }
    }

    if (repair) {
      await base44.entities.RepairOrder.update(repair.id, data);
      toast.success('Orden actualizada');
    } else {
      await base44.entities.RepairOrder.create(data);
      toast.success('Orden creada');
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle>{repair ? 'Editar Orden' : 'Nueva Orden de Reparación'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <Label>Cliente *</Label>
            <Select value={form.customer_id} onValueChange={v => setForm(f => ({ ...f, customer_id: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Equipo *</Label>
            <Select value={form.machine_id} onValueChange={v => setForm(f => ({ ...f, machine_id: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {customerMachines.map(m => <SelectItem key={m.id} value={m.id}>{m.name} {m.brand ? `- ${m.brand}` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-secondary border-border" />
          </div>
          <div>
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_proceso">En Proceso</SelectItem>
                <SelectItem value="finalizada">Finalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Descripción del problema</Label>
            <Textarea value={form.problem_description} onChange={e => setForm(f => ({ ...f, problem_description: e.target.value }))} className="bg-secondary border-border" rows={3} />
          </div>
          <div className="sm:col-span-2">
            <Label>Solución</Label>
            <Textarea value={form.solution_description} onChange={e => setForm(f => ({ ...f, solution_description: e.target.value }))} className="bg-secondary border-border" rows={3} />
          </div>
        </div>

        {/* Parts */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Repuestos utilizados</Label>
            <Button variant="outline" size="sm" onClick={addPart} className="gap-1 text-xs">
              <Plus className="h-3 w-3" /> Agregar
            </Button>
          </div>
          {form.parts_used.map((part, idx) => (
            <div key={idx} className="flex items-center gap-2 mb-2">
              <Select value={part.product_id} onValueChange={v => updatePart(idx, 'product_id', v)}>
                <SelectTrigger className="bg-secondary border-border flex-1"><SelectValue placeholder="Producto" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (Stock: {p.stock || 0})</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" min="1" value={part.quantity} onChange={e => updatePart(idx, 'quantity', Number(e.target.value))} className="w-20 bg-secondary border-border" placeholder="Cant" />
              <Input type="number" value={part.unit_price} onChange={e => updatePart(idx, 'unit_price', Number(e.target.value))} className="w-28 bg-secondary border-border" placeholder="Precio" />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removePart(idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <Label>Mano de obra</Label>
            <Input type="number" value={form.labor_cost} onChange={e => setForm(f => ({ ...f, labor_cost: Number(e.target.value) }))} className="bg-secondary border-border" />
          </div>
          <div className="flex items-end">
            <div className="bg-primary/10 rounded-lg p-3 w-full text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold text-primary">${total.toLocaleString('es-CL')}</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Label>Notas</Label>
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-secondary border-border" rows={2} />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : repair ? 'Actualizar' : 'Crear Orden'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}