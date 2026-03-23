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
    customer_id: '', date: new Date().toISOString().split('T')[0], items: [], discount: 0, notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ customer_id: '', date: new Date().toISOString().split('T')[0], items: [], discount: 0, notes: '' });
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

  const handleSave = async () => {
    if (!form.customer_id) { toast.error('Selecciona un cliente'); return; }
    if (form.items.length === 0) { toast.error('Agrega al menos un producto'); return; }
    setSaving(true);

    const customer = customers.find(c => c.id === form.customer_id);

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
      customer_name: customer?.name || '',
      order_number: `VT-${Date.now().toString().slice(-6)}`,
      subtotal,
      total,
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
            <Select value={form.customer_id} onValueChange={v => setForm(f => ({ ...f, customer_id: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-secondary border-border" />
          </div>
        </div>

        {/* Items */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Productos</Label>
            <Button variant="outline" size="sm" onClick={addItem} className="gap-1 text-xs">
              <Plus className="h-3 w-3" /> Agregar
            </Button>
          </div>
          {form.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 mb-2">
              <Select value={item.product_id} onValueChange={v => updateItem(idx, 'product_id', v)}>
                <SelectTrigger className="bg-secondary border-border flex-1"><SelectValue placeholder="Producto" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (Stock: {p.stock || 0})</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} className="w-20 bg-secondary border-border" />
              <Input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))} className="w-28 bg-secondary border-border" />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <Label>Descuento</Label>
            <Input type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: Number(e.target.value) }))} className="bg-secondary border-border" />
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
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Registrar Venta'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}