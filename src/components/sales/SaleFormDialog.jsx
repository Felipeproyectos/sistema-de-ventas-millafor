import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Barcode } from 'lucide-react';
import { toast } from "sonner";
import BarcodeScannerInput from './BarcodeScannerInput';
import useBarcodeScanner from '@/hooks/useBarcodeScanner';

const emptyItem = () => ({ product_id: '', product_name: '', quantity: 1, unit_price: 0, purchase_price: 0 });

export default function SaleFormDialog({ open, onOpenChange, customers, products, onSaved }) {
  const [form, setForm] = useState({
    customer_id: '', date: new Date().toISOString().split('T')[0], attended_by: '', items: [emptyItem()], discount: 0, abono: 0, notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('select');
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', email: '', address: '' });
  const [scanFeedback, setScanFeedback] = useState({ last: '', error: '' });
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        customer_id: '', date: new Date().toISOString().split('T')[0], attended_by: '', items: [emptyItem()], discount: 0, abono: 0, notes: ''
      });
      setNewCustomerData({ name: '', phone: '', email: '', address: '' });
      setTab('select');
      setScanFeedback({ last: '', error: '' });
      setScannerEnabled(true);
      setScannerActive(false);
    } else {
      setScannerEnabled(false);
      setScannerActive(false);
    }
  }, [open]);

  const handleBarcodeScan = useCallback((code) => {
    // Find product by barcode or by code
    const prod = products.find(p =>
      (p.barcode && p.barcode.trim() === code.trim()) ||
      (p.code && p.code.trim() === code.trim())
    );

    if (!prod) {
      setScanFeedback({ last: '', error: `Código "${code}" no encontrado en inventario` });
      toast.error(`Producto no encontrado: ${code}`);
      return;
    }

    setScanFeedback({ last: `${prod.name} agregado`, error: '' });

    setForm(f => {
      const items = [...f.items];
      const existingIdx = items.findIndex(i => i.product_id === prod.id);
      if (existingIdx >= 0) {
        // Increment quantity
        items[existingIdx] = { ...items[existingIdx], quantity: (items[existingIdx].quantity || 1) + 1 };
        toast.success(`${prod.name} → cant. ${items[existingIdx].quantity}`);
      } else {
        // Remove empty placeholder if only one empty item
        const filtered = items.filter(i => i.product_id !== '');
        filtered.push({
          product_id: prod.id,
          product_name: prod.name,
          quantity: 1,
          unit_price: prod.sale_price || 0,
          purchase_price: prod.purchase_price || 0,
        });
        return { ...f, items: filtered };
      }
      return { ...f, items };
    });
  }, [products]);

  useBarcodeScanner({ onScan: handleBarcodeScan, enabled: open && scannerEnabled && scannerActive });

  const addItem = () => {
    setForm(f => ({ ...f, items: [...f.items, emptyItem()] }));
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

  const handleCreateCustomer = async () => {
    if (!newCustomerData.name || !newCustomerData.phone) {
      toast.error('Nombre y teléfono son obligatorios');
      return;
    }
    const created = await base44.entities.Customer.create(newCustomerData);
    setForm(f => ({ ...f, customer_id: created.id }));
    setNewCustomerData({ name: '', phone: '', email: '', address: '' });
    setTab('select');
    toast.success('Cliente creado');
  };

  const handleSave = async () => {
    if (!form.customer_id) { toast.error('Selecciona un cliente'); return; }
    const validItems = form.items.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) { toast.error('Agrega al menos un producto'); return; }
    setSaving(true);

    const customer = customers.find(c => c.id === form.customer_id);
    const today = new Date().toISOString().split('T')[0];

    // Deduct stock and register inventory movements
    for (const item of validItems) {
      const prod = products.find(p => p.id === item.product_id);
      if (prod) {
        const stockBefore = prod.stock || 0;
        const stockAfter = Math.max(0, stockBefore - item.quantity);
        await base44.entities.Product.update(prod.id, { stock: stockAfter });
        await base44.entities.InventoryMovement.create({
          product_id: prod.id,
          product_name: prod.name,
          type: 'salida',
          quantity: item.quantity,
          stock_before: stockBefore,
          stock_after: stockAfter,
          reason: 'Venta',
          reference: `VT-${Date.now().toString().slice(-6)}`,
          user: form.attended_by || '',
          date: today,
        });
      }
    }

    await base44.entities.SaleOrder.create({
      ...form,
      items: validItems,
      customer_name: customer?.name || '',
      order_number: `VT-${Date.now().toString().slice(-6)}`,
      subtotal,
      total,
      abono: Number(form.abono) || 0,
      status: 'completada',
    });

    toast.success('Venta registrada correctamente');
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader><DialogTitle>Nueva Venta</DialogTitle></DialogHeader>

        {/* Barcode scanner area */}
        <div className={`border rounded-lg p-3 space-y-2 transition-colors ${scannerActive ? 'bg-green-500/10 border-green-500/40' : 'bg-secondary/30 border-border'}`}>
          <div className="flex items-center gap-2">
            <Barcode className={`h-4 w-4 ${scannerActive ? 'text-green-600' : 'text-muted-foreground'}`} />
            <span className={`text-xs font-semibold ${scannerActive ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>
              Escáner de Código de Barras
            </span>
            <Button
              type="button"
              size="sm"
              variant={scannerActive ? 'default' : 'outline'}
              className={`ml-auto text-xs h-7 px-3 gap-1.5 ${scannerActive ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
              onClick={() => setScannerActive(v => !v)}
            >
              <Barcode className="h-3 w-3" />
              {scannerActive ? '🔴 Detener escáner' : '▶ Activar escáner'}
            </Button>
          </div>
          {scannerActive && (
            <>
              <BarcodeScannerInput
                onScan={handleBarcodeScan}
                lastScanned={scanFeedback.last}
                lastError={scanFeedback.error}
              />
              <p className="text-[10px] text-muted-foreground">
                Escáner activo — apunta y dispara. Presiona "Detener escáner" cuando termines.
              </p>
            </>
          )}
          {!scannerActive && (
            <p className="text-[10px] text-muted-foreground">
              Presiona "Activar escáner" y luego usa la pistola para escanear productos.
            </p>
          )}
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="select">Cliente existente</TabsTrigger>
            <TabsTrigger value="new">Crear cliente</TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="space-y-4">
            <div>
              <Label>Cliente *</Label>
              <Select value={form.customer_id} onValueChange={v => setForm(f => ({ ...f, customer_id: v }))}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-4">
            <div className="space-y-3 p-4 bg-secondary/30 rounded-lg">
              <h3 className="text-sm font-semibold">Crear cliente</h3>
              <Input placeholder="Nombre *" value={newCustomerData.name} onChange={e => setNewCustomerData(c => ({ ...c, name: e.target.value }))} className="bg-background border-border" />
              <Input placeholder="Teléfono *" value={newCustomerData.phone} onChange={e => setNewCustomerData(c => ({ ...c, phone: e.target.value }))} className="bg-background border-border" />
              <Input type="email" placeholder="Email" value={newCustomerData.email} onChange={e => setNewCustomerData(c => ({ ...c, email: e.target.value }))} className="bg-background border-border" />
              <Input placeholder="Dirección" value={newCustomerData.address} onChange={e => setNewCustomerData(c => ({ ...c, address: e.target.value }))} className="bg-background border-border" />
              <Button onClick={handleCreateCustomer} className="w-full">Crear cliente</Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-secondary border-border" />
          </div>
          <div>
            <Label>Atendido por</Label>
            <Input value={form.attended_by} onChange={e => setForm(f => ({ ...f, attended_by: e.target.value }))} className="bg-secondary border-border" placeholder="Nombre de quien atiende" />
          </div>
        </div>

        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Productos ({form.items.filter(i => i.product_id).length})</Label>
            <Button variant="outline" size="sm" onClick={addItem} className="gap-1 text-xs">
              <Plus className="h-3 w-3" /> Agregar
            </Button>
          </div>

          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 mb-1 px-1">
            <span className="text-xs text-muted-foreground">Producto</span>
            <span className="text-xs text-muted-foreground w-20 text-center">Cant</span>
            <span className="text-xs text-muted-foreground w-28 text-center">Precio</span>
            <span className="text-xs text-muted-foreground w-8"></span>
          </div>

          <div className="space-y-2">
            {form.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
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
                <Input
                  type="number" min="1" value={item.quantity}
                  onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                  className="w-20 bg-secondary border-border"
                />
                <Input
                  type="number" value={item.unit_price}
                  onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
                  className="w-28 bg-secondary border-border"
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
            <Label>Descuento</Label>
            <Input type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: Number(e.target.value) }))} className="bg-secondary border-border" />
          </div>
          <div>
            <Label>Abono</Label>
            <Input type="number" value={form.abono} onChange={e => setForm(f => ({ ...f, abono: Number(e.target.value) }))} className="bg-secondary border-border" />
          </div>
          <div className="bg-primary/10 rounded-lg p-3 text-center flex flex-col justify-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold text-primary">${total.toLocaleString('es-CL')}</p>
          </div>
        </div>

        <div className="mt-2">
          <Label>Notas</Label>
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-secondary border-border" rows={2} />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Registrar Venta'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}