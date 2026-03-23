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

const emptyItem = () => ({ product_id: '', description: '', quantity: 1, unit_price: 0, purchase_price: 0 });

export default function QuoteFormDialog({ open, onOpenChange, customers, machines, products, onSaved }) {
  const [form, setForm] = useState({
    customer_id: '', machine_id: '',
    date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    type: 'venta',
    items: [emptyItem()],
    labor_cost: 0, discount: 0, notes: '', status: 'pendiente'
  });
  const [saving, setSaving] = useState(false);
  const [customerInput, setCustomerInput] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customerData, setCustomerData] = useState({ phone: '', email: '', address: '', rut: '' });

  useEffect(() => {
    if (open) {
      setForm({
        customer_id: '', machine_id: '',
        date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        type: 'venta',
        items: [emptyItem()],
        labor_cost: 0, discount: 0, notes: '', status: 'pendiente'
      });
      setCustomerInput('');
      setIsNewCustomer(false);
      setCustomerData({ phone: '', email: '', address: '', rut: '' });
    }
  }, [open]);

  const subtotal = form.items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
  const total = subtotal + (Number(form.labor_cost) || 0) - (Number(form.discount) || 0);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const updateItem = (idx, field, value) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      // When selecting a product, auto-fill price and description
      if (field === 'product_id') {
        const prod = products.find(p => p.id === value);
        if (prod) {
          items[idx].description = prod.name;
          items[idx].unit_price = prod.sale_price || 0;
          items[idx].purchase_price = prod.purchase_price || 0;
        }
      }
      return { ...f, items };
    });
  };

  const customerMachines = machines.filter(m => !form.customer_id || m.customer_id === form.customer_id);

  const handleCustomerSelect = (customerId) => {
    const existing = customers.find(c => c.id === customerId);
    if (existing) {
      setForm(f => ({ ...f, customer_id: customerId }));
      setCustomerInput(existing.name);
      setIsNewCustomer(false);
    }
  };

  const handleCustomerInputChange = (val) => {
    setCustomerInput(val);
    setIsNewCustomer(false);
  };

  const handleCreateNewCustomer = () => {
    if (customerInput.trim()) {
      setForm(f => ({ ...f, customer_id: `new_${customerInput}` }));
      setIsNewCustomer(true);
    }
  };

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(customerInput.toLowerCase()));

  const handleSave = async () => {
    if (!customerInput) { toast.error('Ingresa un cliente'); return; }
    if (isNewCustomer && !customerData.phone) { toast.error('El teléfono del cliente es obligatorio'); return; }
    if (form.items.length === 0 || !form.items[0].description) { toast.error('Agrega al menos un ítem'); return; }
    setSaving(true);
    let customerId = form.customer_id;
    let customerName = customerInput;
    if (isNewCustomer) {
      const newCustomer = await base44.entities.Customer.create({
        name: customerName,
        phone: customerData.phone,
        email: customerData.email,
        address: customerData.address,
        notes: customerData.rut ? `RUT: ${customerData.rut}` : ''
      });
      customerId = newCustomer.id;
    }
    const machine = machines.find(m => m.id === form.machine_id);
    await base44.entities.Quote.create({
      ...form,
      customer_id: customerId,
      customer_name: customerName,
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle>Nueva Cotización</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="sm:col-span-2">
            <Label>Cliente *</Label>
            <Input
              value={customerInput}
              onChange={e => handleCustomerInputChange(e.target.value)}
              placeholder="Busca un cliente existente"
              className="bg-secondary border-border"
            />
            {customerInput && !isNewCustomer && (
              <div className="mt-2 bg-secondary rounded-lg border border-border max-h-40 overflow-y-auto">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleCustomerSelect(c.id)}
                      className="block w-full text-left text-sm px-3 py-2 hover:bg-primary/20 border-b border-border last:border-b-0"
                    >
                      {c.name}
                    </button>
                  ))
                ) : (
                  <button
                    onClick={handleCreateNewCustomer}
                    className="block w-full text-left text-sm px-3 py-2 hover:bg-accent/20 text-accent font-medium"
                  >
                    + Crear nuevo cliente: {customerInput}
                  </button>
                )}
              </div>
            )}
            {isNewCustomer && <p className="text-xs text-accent mt-2 font-medium">✓ Nuevo cliente: {customerInput}</p>}
          </div>
           {isNewCustomer && (
             <div className="sm:col-span-2 mt-4 pt-4 border-t border-border space-y-3" style={{gridColumn: 'span 2'}}>
             <p className="text-xs font-semibold text-muted-foreground">Información del cliente</p>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               <div>
                 <Label className="text-xs">Teléfono *</Label>
                 <Input
                   value={customerData.phone}
                   onChange={e => setCustomerData(d => ({ ...d, phone: e.target.value }))}
                   placeholder="+56 9 1234 5678"
                   className="bg-secondary border-border text-sm"
                 />
               </div>
               <div>
                 <Label className="text-xs">Email</Label>
                 <Input
                   type="email"
                   value={customerData.email}
                   onChange={e => setCustomerData(d => ({ ...d, email: e.target.value }))}
                   placeholder="cliente@email.com"
                   className="bg-secondary border-border text-sm"
                 />
               </div>
               <div>
                 <Label className="text-xs">RUT</Label>
                 <Input
                   value={customerData.rut}
                   onChange={e => setCustomerData(d => ({ ...d, rut: e.target.value }))}
                   placeholder="XX.XXX.XXX-X"
                   className="bg-secondary border-border text-sm"
                 />
               </div>
               <div>
                 <Label className="text-xs">Dirección</Label>
                 <Input
                   value={customerData.address}
                   onChange={e => setCustomerData(d => ({ ...d, address: e.target.value }))}
                   placeholder="Dirección del cliente"
                   className="bg-secondary border-border text-sm"
                 />
               </div>
             </div>
           </div>
           )}
          <div>
            <Label>Tipo de cotización</Label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v, machine_id: '', items: [emptyItem()] }))}>
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
            <Label className="text-sm font-semibold">
              {form.type === 'venta' ? 'Productos del inventario' : 'Repuestos / Materiales'}
            </Label>
            <Button variant="outline" size="sm" onClick={addItem} className="gap-1 text-xs">
              <Plus className="h-3 w-3" /> Agregar
            </Button>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 mb-1 px-1">
            <span className="text-xs text-muted-foreground">{form.type === 'venta' ? 'Producto' : 'Descripción'}</span>
            <span className="text-xs text-muted-foreground w-20 text-center">Cant</span>
            <span className="text-xs text-muted-foreground w-28 text-center">Precio</span>
            <span className="text-xs text-muted-foreground w-8"></span>
          </div>

          <div className="space-y-2">
            {form.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {form.type === 'venta' ? (
                  <Select value={item.product_id} onValueChange={v => updateItem(idx, 'product_id', v)}>
                    <SelectTrigger className="bg-secondary border-border flex-1">
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — Stock: {p.stock || 0}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={item.description}
                    onChange={e => updateItem(idx, 'description', e.target.value)}
                    className="bg-secondary border-border flex-1"
                    placeholder="Descripción del servicio o repuesto"
                  />
                )}
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
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive flex-shrink-0" onClick={() => removeItem(idx)}>
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

        <div className="flex justify-end gap-2 mt-4">
         <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
         <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Crear Cotización'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}