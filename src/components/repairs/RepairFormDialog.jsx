import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from 'lucide-react';
import { toast } from "sonner";

export default function RepairFormDialog({ open, onOpenChange, repair, customers, machines, products, onSaved }) {
  const [form, setForm] = useState({
    customer_id: '', machine_id: '', date: new Date().toISOString().split('T')[0],
    problem_description: '', solution_description: '', status: 'pendiente',
    attended_by: '', parts_used: [], labor_cost: 0, abono: 0, notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('select');
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const [newMachine, setNewMachine] = useState({ name: '', brand: '', model: '', serial_number: '' });

  useEffect(() => {
    if (repair) {
      setForm({
        customer_id: repair.customer_id || '',
        machine_id: repair.machine_id || '',
        date: repair.date || new Date().toISOString().split('T')[0],
        problem_description: repair.problem_description || '',
        solution_description: repair.solution_description || '',
        status: repair.status || 'pendiente',
        attended_by: repair.attended_by || '',
        parts_used: repair.parts_used || [],
        labor_cost: repair.labor_cost || 0,
        abono: repair.abono || 0,
        notes: repair.notes || '',
      });
      setTab('select');
    } else {
      setForm({
        customer_id: '', machine_id: '', date: new Date().toISOString().split('T')[0],
        problem_description: '', solution_description: '', status: 'pendiente',
        attended_by: '', parts_used: [], labor_cost: 0, abono: 0, notes: ''
      });
      setNewCustomer({ name: '', phone: '', email: '', address: '' });
      setNewMachine({ name: '', brand: '', model: '', serial_number: '' });
      setTab('select');
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
  const saldo = total - (Number(form.abono) || 0);

  const customerMachines = machines.filter(m => !form.customer_id || m.customer_id === form.customer_id);
  const selectedCustomer = customers.find(c => c.id === form.customer_id);

  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      toast.error('Nombre y teléfono son obligatorios');
      return;
    }
    try {
      const created = await base44.entities.Customer.create(newCustomer);
      setForm(f => ({ ...f, customer_id: created.id }));
      setNewCustomer({ name: '', phone: '', email: '', address: '' });
      toast.success('Cliente creado');
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  const handleCreateMachine = async () => {
    if (!newMachine.name || !form.customer_id) {
      toast.error('Nombre del equipo y cliente son obligatorios');
      return;
    }
    try {
      const created = await base44.entities.Machine.create({
        ...newMachine,
        customer_id: form.customer_id
      });
      setForm(f => ({ ...f, machine_id: created.id }));
      setNewMachine({ name: '', brand: '', model: '', serial_number: '' });
      toast.success('Equipo creado');
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  const handleSave = async () => {
    if (!form.customer_id || !form.machine_id) {
      toast.error('Selecciona cliente y equipo');
      return;
    }
    setSaving(true);
    try {
      const customer = customers.find(c => c.id === form.customer_id);
      const machine = machines.find(m => m.id === form.machine_id);

      const data = {
        ...form,
        customer_name: customer?.name || '',
        machine_name: machine?.name || '',
        total,
        abono: Number(form.abono) || 0,
        order_number: repair?.order_number || `OR-${Date.now().toString().slice(-6)}`,
      };

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

      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const isFormComplete = form.customer_id && form.machine_id && (form.parts_used.length > 0 || form.problem_description);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle>{repair ? 'Editar Orden' : 'Nueva Orden de Reparación'}</DialogTitle>
        </DialogHeader>

        {!repair && (
          <Tabs value={tab} onValueChange={setTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="select">Seleccionar</TabsTrigger>
              <TabsTrigger value="new">Crear desde 0</TabsTrigger>
            </TabsList>

            <TabsContent value="select" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>
            </TabsContent>

            <TabsContent value="new" className="space-y-4">
              <div className="space-y-3 p-4 bg-secondary/30 rounded-lg">
                <h3 className="text-sm font-semibold">Crear cliente</h3>
                <Input
                  placeholder="Nombre *"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer(c => ({ ...c, name: e.target.value }))}
                  className="bg-background border-border"
                />
                <Input
                  placeholder="Teléfono *"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer(c => ({ ...c, phone: e.target.value }))}
                  className="bg-background border-border"
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={newCustomer.email}
                  onChange={e => setNewCustomer(c => ({ ...c, email: e.target.value }))}
                  className="bg-background border-border"
                />
                <Input
                  placeholder="Dirección"
                  value={newCustomer.address}
                  onChange={e => setNewCustomer(c => ({ ...c, address: e.target.value }))}
                  className="bg-background border-border"
                />
                <Button onClick={handleCreateCustomer} className="w-full">Crear cliente</Button>
              </div>

              {form.customer_id && (
                <div className="space-y-3 p-4 bg-secondary/30 rounded-lg">
                  <h3 className="text-sm font-semibold">Crear equipo para {selectedCustomer?.name}</h3>
                  <Input
                    placeholder="Nombre del equipo *"
                    value={newMachine.name}
                    onChange={e => setNewMachine(m => ({ ...m, name: e.target.value }))}
                    className="bg-background border-border"
                  />
                  <Input
                    placeholder="Marca"
                    value={newMachine.brand}
                    onChange={e => setNewMachine(m => ({ ...m, brand: e.target.value }))}
                    className="bg-background border-border"
                  />
                  <Input
                    placeholder="Modelo"
                    value={newMachine.model}
                    onChange={e => setNewMachine(m => ({ ...m, model: e.target.value }))}
                    className="bg-background border-border"
                  />
                  <Input
                    placeholder="Número de serie"
                    value={newMachine.serial_number}
                    onChange={e => setNewMachine(m => ({ ...m, serial_number: e.target.value }))}
                    className="bg-background border-border"
                  />
                  <Button onClick={handleCreateMachine} className="w-full">Crear equipo</Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {repair && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Cliente</Label>
              <Select value={form.customer_id} onValueChange={v => setForm(f => ({ ...f, customer_id: v }))}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Equipo</Label>
              <Select value={form.machine_id} onValueChange={v => setForm(f => ({ ...f, machine_id: v }))}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {customerMachines.map(m => <SelectItem key={m.id} value={m.id}>{m.name} {m.brand ? `- ${m.brand}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
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
          <div className="sm:col-span-2">
            <Label>Atendido por</Label>
            <Input value={form.attended_by} onChange={e => setForm(f => ({ ...f, attended_by: e.target.value }))} className="bg-secondary border-border" placeholder="Nombre del técnico" />
          </div>
        </div>

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
          <div>
            <Label>Abono / Anticipo</Label>
            <Input type="number" value={form.abono} onChange={e => setForm(f => ({ ...f, abono: Number(e.target.value) }))} className="bg-secondary border-border" placeholder="0" />
          </div>
          <div className="bg-primary/10 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold text-primary">${total.toLocaleString('es-CL')}</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${saldo <= 0 ? 'bg-accent/10' : 'bg-warning/10'}`}>
            <p className="text-xs text-muted-foreground">Saldo pendiente</p>
            <p className={`text-xl font-bold ${saldo <= 0 ? 'text-accent' : 'text-warning'}`}>${saldo.toLocaleString('es-CL')}</p>
          </div>
        </div>

        <div className="mt-4">
          <Label>Notas</Label>
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-secondary border-border" rows={2} />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !isFormComplete}>
            {saving ? 'Guardando...' : repair ? 'Actualizar' : 'Crear Orden'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}