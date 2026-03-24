import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Search, UserPlus } from 'lucide-react';
import { toast } from "sonner";

export default function RepairFormDialog({ open, onOpenChange, repair, customers, machines, products, onSaved }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [form, setForm] = useState({
    customer_id: '', machine_id: '', date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    problem_description: '', solution_description: '', status: 'pendiente',
    attended_by: '', parts_used: [], labor_cost: 0, abono: 0, notes: '',
    machine_brand: '', machine_model: '', machine_serial: '', machine_type: ''
  });
  const [saving, setSaving] = useState(false);

  // Customer search state
  const [customerInput, setCustomerInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ phone: '', email: '', address: '' });
  const customerRef = useRef(null);

  // New machine state
  const [showNewMachine, setShowNewMachine] = useState(false);
  const [newMachine, setNewMachine] = useState({ name: '', brand: '', model: '', type: '', serial_number: '' });

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  useEffect(() => {
    if (repair) {
      setForm({
        customer_id: repair.customer_id || '',
        machine_id: repair.machine_id || '',
        date: repair.date || new Date().toISOString().split('T')[0],
        delivery_date: repair.delivery_date || '',
        problem_description: repair.problem_description || '',
        solution_description: repair.solution_description || '',
        status: repair.status || 'pendiente',
        attended_by: repair.attended_by || '',
        parts_used: repair.parts_used || [],
        labor_cost: repair.labor_cost || 0,
        abono: repair.abono || 0,
        notes: repair.notes || '',
        machine_brand: repair.machine_brand || '',
        machine_model: repair.machine_model || '',
        machine_serial: repair.machine_serial || '',
        machine_type: repair.machine_type || '',
      });
      const c = customers.find(x => x.id === repair.customer_id);
      setCustomerInput(c?.name || '');
      setIsNewCustomer(false);
    } else {
      setForm({
        customer_id: '', machine_id: '', date: new Date().toISOString().split('T')[0],
        delivery_date: '',
        problem_description: '', solution_description: '', status: 'pendiente',
        attended_by: currentUser?.nick || currentUser?.full_name || '',
        parts_used: [], labor_cost: 0, abono: 0, notes: '',
        machine_brand: '', machine_model: '', machine_serial: '', machine_type: ''
      });
      setCustomerInput('');
      setIsNewCustomer(false);
      setNewCustomerData({ phone: '', email: '', address: '' });
      setShowNewMachine(false);
      setNewMachine({ name: '', brand: '', model: '', type: '', serial_number: '' });
    }
  }, [repair, open, currentUser]);

  const filteredCustomers = customers.filter(c =>
    customerInput.length >= 1 && c.name?.toLowerCase().includes(customerInput.toLowerCase())
  );

  const handleCustomerInputChange = (val) => {
    setCustomerInput(val);
    setIsNewCustomer(false);
    setForm(f => ({ ...f, customer_id: '' }));
    setShowSuggestions(true);
  };

  const handleSelectCustomer = (c) => {
    setCustomerInput(c.name);
    setForm(f => ({ ...f, customer_id: c.id }));
    setIsNewCustomer(false);
    setShowSuggestions(false);
  };

  const handleCreateNewCustomer = () => {
    setIsNewCustomer(true);
    setShowSuggestions(false);
    setForm(f => ({ ...f, customer_id: `new_${customerInput}` }));
  };

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

  const handleMachineSelect = (machineId) => {
    const m = machines.find(x => x.id === machineId);
    setForm(f => ({
      ...f,
      machine_id: machineId,
      machine_brand: m?.brand || '',
      machine_model: m?.model || '',
      machine_serial: m?.serial_number || '',
      machine_type: m?.type || '',
    }));
  };

  const partsTotal = form.parts_used.reduce((s, p) => s + (p.quantity || 0) * (p.unit_price || 0), 0);
  const total = partsTotal + (Number(form.labor_cost) || 0);
  const saldo = total - (Number(form.abono) || 0);

  const customerMachines = machines.filter(m => !form.customer_id || m.customer_id === form.customer_id);

  const handleSave = async () => {
    if (!form.customer_id) { toast.error('Selecciona o crea un cliente'); return; }
    setSaving(true);
    try {
      let customerId = form.customer_id;
      let customerName = customerInput;

      // Create new customer if needed
      if (isNewCustomer) {
        if (!newCustomerData.phone) { toast.error('El teléfono es obligatorio'); setSaving(false); return; }
        const created = await base44.entities.Customer.create({
          name: customerName,
          phone: newCustomerData.phone,
          email: newCustomerData.email,
          address: newCustomerData.address,
        });
        customerId = created.id;
      }

      // Create new machine if needed
      let machineId = form.machine_id;
      let machineName = '';
      if (showNewMachine && (newMachine.brand || newMachine.model)) {
        const autoName = [newMachine.brand, newMachine.model].filter(Boolean).join(' ') || 'Equipo';
        const createdM = await base44.entities.Machine.create({ ...newMachine, name: autoName, customer_id: customerId });
        machineId = createdM.id;
        machineName = createdM.name;
      } else {
        const m = machines.find(x => x.id === machineId);
        machineName = m?.name || '';
      }

      const data = {
        ...form,
        customer_id: customerId,
        customer_name: customerName,
        machine_id: machineId,
        machine_name: machineName,
        total,
        abono: Number(form.abono) || 0,
        order_number: repair?.order_number || `OR-${Date.now().toString().slice(-6)}`,
      };

      if (!repair) {
        for (const part of form.parts_used) {
          if (part.product_id && part.quantity > 0) {
            const prod = products.find(p => p.id === part.product_id);
            if (prod) await base44.entities.Product.update(prod.id, { stock: Math.max(0, (prod.stock || 0) - part.quantity) });
          }
        }
      } else {
        const oldParts = repair.parts_used || [];
        for (const newPart of form.parts_used) {
          if (!newPart.product_id) continue;
          const oldPart = oldParts.find(op => op.product_id === newPart.product_id);
          const diff = (newPart.quantity || 0) - (oldPart ? oldPart.quantity : 0);
          if (diff !== 0) {
            const prod = products.find(p => p.id === newPart.product_id);
            if (prod) await base44.entities.Product.update(prod.id, { stock: Math.max(0, (prod.stock || 0) - diff) });
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

  const isFormComplete = form.customer_id && (form.parts_used.length > 0 || form.problem_description);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle>{repair ? 'Editar Orden' : 'Nueva Orden de Reparación'}</DialogTitle>
        </DialogHeader>

        {/* ── CLIENTE ── */}
        <div className="mt-4 space-y-3">
          <div className="p-4 bg-secondary/30 rounded-xl border border-border space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5" /> Datos del Cliente
            </p>

            <div className="relative">
              <Label>Cliente *</Label>
              <Input
                ref={customerRef}
                value={customerInput}
                onChange={e => handleCustomerInputChange(e.target.value)}
                onFocus={() => customerInput.length >= 1 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Busca por nombre..."
                className="bg-background border-border"
              />
              {showSuggestions && customerInput.length >= 1 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
                  {filteredCustomers.length > 0 ? (
                    <>
                      {filteredCustomers.slice(0, 5).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full text-left px-3 py-2.5 hover:bg-secondary transition-colors border-b border-border last:border-b-0"
                        >
                          <p className="text-sm font-medium">{c.name}</p>
                          {(c.phone || c.email) && (
                            <p className="text-xs text-muted-foreground">{[c.phone, c.email].filter(Boolean).join(' · ')}</p>
                          )}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleCreateNewCustomer}
                        className="w-full text-left px-3 py-2.5 hover:bg-accent/10 text-accent font-medium text-sm flex items-center gap-1.5"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Crear nuevo: "{customerInput}"
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCreateNewCustomer}
                      className="w-full text-left px-3 py-2.5 hover:bg-accent/10 text-accent font-medium text-sm flex items-center gap-1.5"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Crear nuevo cliente: "{customerInput}"
                    </button>
                  )}
                </div>
              )}
              {form.customer_id && !isNewCustomer && (
                <p className="text-xs text-accent mt-1">✓ Cliente seleccionado</p>
              )}
              {isNewCustomer && (
                <p className="text-xs text-accent mt-1">✓ Nuevo cliente: {customerInput}</p>
              )}
            </div>

            {isNewCustomer && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                <div>
                  <Label className="text-xs">Teléfono *</Label>
                  <Input value={newCustomerData.phone} onChange={e => setNewCustomerData(d => ({ ...d, phone: e.target.value }))} className="bg-background border-border" placeholder="+56 9 ..." />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={newCustomerData.email} onChange={e => setNewCustomerData(d => ({ ...d, email: e.target.value }))} className="bg-background border-border" placeholder="correo@..." />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Dirección</Label>
                  <Input value={newCustomerData.address} onChange={e => setNewCustomerData(d => ({ ...d, address: e.target.value }))} className="bg-background border-border" placeholder="Dirección..." />
                </div>
              </div>
            )}
          </div>

          {/* ── EQUIPO ── */}
          <div className="p-4 bg-secondary/30 rounded-xl border border-border space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipo / Máquina</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Seleccionar equipo existente</Label>
                <Select value={form.machine_id} onValueChange={handleMachineSelect}>
                  <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {customerMachines.map(m => <SelectItem key={m.id} value={m.id}>{m.name} {m.brand ? `- ${m.brand}` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setShowNewMachine(!showNewMachine)}
                  className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> {showNewMachine ? 'Cancelar nuevo equipo' : 'Registrar nuevo equipo'}
                </button>
              </div>
            </div>

            {showNewMachine && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                <div><Label className="text-xs">Marca</Label><Input value={newMachine.brand} onChange={e => setNewMachine(m => ({ ...m, brand: e.target.value }))} className="bg-background border-border" /></div>
                <div><Label className="text-xs">Modelo</Label><Input value={newMachine.model} onChange={e => setNewMachine(m => ({ ...m, model: e.target.value }))} className="bg-background border-border" /></div>
                <div><Label className="text-xs">Tipo</Label><Input value={newMachine.type} onChange={e => setNewMachine(m => ({ ...m, type: e.target.value }))} className="bg-background border-border" /></div>
                <div><Label className="text-xs">N° de serie</Label><Input value={newMachine.serial_number} onChange={e => setNewMachine(m => ({ ...m, serial_number: e.target.value }))} className="bg-background border-border" /></div>
              </div>
            )}

            {/* Machine detail fields - only show when no new machine form open */}
            {!showNewMachine && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                <div><Label className="text-xs">Marca</Label><Input value={form.machine_brand} onChange={e => setForm(f => ({ ...f, machine_brand: e.target.value }))} className="bg-background border-border h-8 text-sm" /></div>
                <div><Label className="text-xs">Modelo</Label><Input value={form.machine_model} onChange={e => setForm(f => ({ ...f, machine_model: e.target.value }))} className="bg-background border-border h-8 text-sm" /></div>
                <div><Label className="text-xs">N° de serie</Label><Input value={form.machine_serial} onChange={e => setForm(f => ({ ...f, machine_serial: e.target.value }))} className="bg-background border-border h-8 text-sm" /></div>
                <div><Label className="text-xs">Tipo</Label><Input value={form.machine_type} onChange={e => setForm(f => ({ ...f, machine_type: e.target.value }))} className="bg-background border-border h-8 text-sm" /></div>
              </div>
            )}
          </div>
        </div>

        {/* ── ORDEN INFO ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <div>
            <Label>Fecha de ingreso</Label>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-secondary border-border" />
          </div>
          <div>
            <Label>Fecha estimada de entrega</Label>
            <Input type="date" value={form.delivery_date} onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} className="bg-secondary border-border" />
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
          <div>
            <Label>Atendido por</Label>
            <Input value={form.attended_by} onChange={e => setForm(f => ({ ...f, attended_by: e.target.value }))} className="bg-secondary border-border" placeholder="Técnico" />
          </div>
          <div className="sm:col-span-2">
            <Label>Descripción del problema</Label>
            <Textarea value={form.problem_description} onChange={e => setForm(f => ({ ...f, problem_description: e.target.value }))} className="bg-secondary border-border" rows={3} />
          </div>
          <div className="sm:col-span-2">
            <Label>Solución</Label>
            <Textarea value={form.solution_description} onChange={e => setForm(f => ({ ...f, solution_description: e.target.value }))} className="bg-secondary border-border" rows={2} />
          </div>
        </div>

        {/* ── REPUESTOS ── */}
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

        {/* ── TOTALES ── */}
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