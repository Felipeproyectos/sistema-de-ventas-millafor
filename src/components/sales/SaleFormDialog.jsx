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

export default function SaleFormDialog({ open, onOpenChange, customers, products, onSaved }) {
  const [form, setForm] = useState({
    customer_id: '', date: new Date().toISOString().split('T')[0], items: [], discount: 0, abono: 0, notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [customerInput, setCustomerInput] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customerData, setCustomerData] = useState({ phone: '', email: '', address: '', rut: '' });

  useEffect(() => {
    if (open) {
      setForm({ customer_id: '', date: new Date().toISOString().split('T')[0], items: [], discount: 0, abono: 0, notes: '' });
      setCustomerInput('');
      setIsNewCustomer(false);
      setCustomerData({ phone: '', email: '', address: '', rut: '' });
    }
  }, [open]);

  const addItem = () => {
    setForm(f => ({ ...f, items: [...f.items, { product_id: '', product_name: '', quantity: 1, unit_price: 0, purchase_price: 0 }] }));
  };

  const updateItem = (idx, field, value) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      if (field === 'product_id') {
        const prod = products.find(p => p.id === value);
        if (prod) {
          items[idx].product_name = prod.name;
          items[idx].unit_price = prod.sale_price || 0;
          items[idx].purchase_price = prod.purchase_price || 0;
        }
      }
      return { ...f, items };
    });
  };

  const removeItem = (idx) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const subtotal = form.items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
  const total = subtotal - (Number(form.discount) || 0);
  const saldo = total - (Number(form.abono) || 0);

  const handleCustomerSelect = (value) => {
    const existing = customers.find(c => c.id === value);
    if (existing) {
      setForm(f => ({ ...f, customer_id: value }));
      setCustomerInput(existing.name);
      setIsNewCustomer(false);
    }
  };

  const handleCustomerInputChange = (val) => {
    setCustomerInput(val);
    const match = customers.find(c => c.name.toLowerCase().includes(val.toLowerCase()));
    if (match) {
      handleCustomerSelect(match.id);
    } else if (val.trim()) {
      setForm(f => ({ ...f, customer_id: `new_${val}` }));
      setIsNewCustomer(true);
    }
  };

  const handleSave = async () => {
    if (!customerInput) { toast.error('Ingresa un cliente'); return; }
    if (isNewCustomer && !customerData.phone) { toast.error('El teléfono del cliente es obligatorio'); return; }
    if (form.items.length === 0) { toast.error('Agrega al menos un producto'); return; }
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

    // Deduct stock
    for (const item of form.items) {
      if (item.product_id && item.quantity > 0) {
        const prod = products.find(p => p.id === item.product_id);
        if (prod) {
          await base44.entities.Product.update(prod.id, { stock: Math.max(0, (prod.stock || 0) - item.quantity) });
        }
      }
    }

    await base44.entities.SaleOrder.create({
      ...form,
      customer_id: customerId,
      customer_name: customerName,
      order_number: `VT-${Date.now().toString().slice(-6)}`,
      subtotal,
      total,
      abono: Number(form.abono) || 0,
      status: 'completada',
    });

    toast.success('Venta registrada');
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader><DialogTitle>Nueva Venta</DialogTitle></DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <Label>Cliente *</Label>
            <div className="flex gap-2">
              <Input
                value={customerInput}
                onChange={e => handleCustomerInputChange(e.target.value)}
                placeholder="Escribe o selecciona cliente"
                className="bg-secondary border-border flex-1"
              />
            </div>
            {customers.length > 0 && customerInput && !isNewCustomer && (
              <div className="mt-1 bg-secondary rounded-lg p-2 border border-border max-h-32 overflow-y-auto">
                {customers
                  .filter(c => c.name.toLowerCase().includes(customerInput.toLowerCase()))
                  .map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleCustomerSelect(c.id)}
                      className="block w-full text-left text-sm px-2 py-1 hover:bg-primary/20 rounded"
                    >
                      {c.name}
                    </button>
                  ))
                }
              </div>
            )}
            {isNewCustomer && <p className="text-xs text-accent mt-1">✓ Nuevo cliente: {customerInput}</p>}
          </div>
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-secondary border-border" />
          </div>
          {isNewCustomer && (
            <div className="sm:col-span-2 mt-4 pt-4 border-t border-border space-y-3">
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
        </div>

        <div className="mt-4">
          <Label>Notas</Label>
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-secondary border-border" rows={2} />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Registrar Venta'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}