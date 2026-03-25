import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Search, UserPlus, Package, Wrench } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';

const emptyItem = () => ({ type: 'service', description: '', product_id: '', quantity: 1, unit_price: 0 });

export default function QuoteFormDialog({ open, onOpenChange, customers, products, onSaved }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    attended_by: '',
    items: [emptyItem()],
    labor_cost: 0, discount: 0, notes: '', status: 'pendiente'
  });
  const [saving, setSaving] = useState(false);

  // Customer fields
  const [searchInput, setSearchInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerFields, setCustomerFields] = useState({ name: '', phone: '', email: '', address: '', rut: '' });
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        attended_by: '',
        items: [emptyItem()],
        labor_cost: 0, discount: 0, notes: '', status: 'pendiente'
      });
      setSearchInput('');
      setSelectedCustomerId('');
      setCustomerFields({ name: '', phone: '', email: '', address: '', rut: '' });
      setIsNewCustomer(false);
      setShowSuggestions(false);
    }
  }, [open]);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchInput.toLowerCase()) ||
    (c.phone && c.phone.includes(searchInput))
  );

  const handleSelectExisting = (c) => {
    setSelectedCustomerId(c.id);
    setSearchInput(c.name);
    setCustomerFields({
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      rut: c.notes?.replace('RUT: ', '') || ''
    });
    setIsNewCustomer(false);
    setShowSuggestions(false);
  };

  const handleSearchChange = (val) => {
    setSearchInput(val);
    setSelectedCustomerId('');
    setIsNewCustomer(false);
    setCustomerFields(f => ({ ...f, name: val }));
    setShowSuggestions(true);
  };

  const handleNewManual = () => {
    setIsNewCustomer(true);
    setShowSuggestions(false);
    setCustomerFields(f => ({ ...f, name: searchInput }));
  };

  const subtotal = form.items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
  const total = subtotal + (Number(form.labor_cost) || 0) - (Number(form.discount) || 0);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx, field, value) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      if (field === 'product_id') {
        const prod = (products || []).find(p => p.id === value);
        if (prod) {
          items[idx].description = prod.name;
          items[idx].unit_price = prod.sale_price || 0;
        }
      }
      if (field === 'type') {
        items[idx].description = '';
        items[idx].product_id = '';
        items[idx].unit_price = 0;
      }
      return { ...f, items };
    });
  };

  const handleSave = async () => {
    if (!customerFields.name) { toast.error('Ingresa el nombre del cliente'); return; }
    const validItems = form.items.filter(i => i.description);
    if (validItems.length === 0) { toast.error('Agrega al menos un ítem con descripción'); return; }

    setSaving(true);
    let customerId = selectedCustomerId;
    let customerName = customerFields.name;

    if (!selectedCustomerId) {
      // Create new customer
      const newC = await base44.entities.Customer.create({
        name: customerFields.name,
        phone: customerFields.phone,
        email: customerFields.email,
        address: customerFields.address,
        notes: customerFields.rut ? `RUT: ${customerFields.rut}` : ''
      });
      customerId = newC.id;
      customers.push(newC);
    }

    await base44.entities.Quote.create({
      ...form,
      items: validItems,
      customer_id: customerId,
      customer_name: customerName,
      total,
      quote_number: `CT-${Date.now().toString().slice(-6)}`,
      type: 'venta',
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

        {/* Cliente */}
        <div className="space-y-3 mt-2">
          <div>
            <Label>Cliente *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={e => handleSearchChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Buscar cliente existente..."
                className="pl-9 bg-secondary border-border"
              />
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && searchInput && (
              <div className="mt-1 bg-secondary border border-border rounded-lg max-h-44 overflow-y-auto z-10 relative">
                {filteredCustomers.length > 0 && filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    onMouseDown={() => handleSelectExisting(c)}
                    className="flex w-full text-left text-sm px-3 py-2 hover:bg-primary/20 border-b border-border last:border-b-0 gap-2"
                  >
                    <span className="font-medium">{c.name}</span>
                    {c.phone && <span className="text-muted-foreground text-xs">{c.phone}</span>}
                  </button>
                ))}
                <button
                  onMouseDown={handleNewManual}
                  className="flex items-center gap-2 w-full text-left text-sm px-3 py-2 hover:bg-accent/20 text-accent font-medium"
                >
                  <UserPlus className="h-4 w-4" />
                  Agregar manualmente: <span className="underline">{searchInput}</span>
                </button>
              </div>
            )}

            {selectedCustomerId && (
              <p className="text-xs text-accent mt-1">✓ Cliente existente seleccionado</p>
            )}
          </div>

          {/* Customer fields — always visible once name is set */}
          {(isNewCustomer || selectedCustomerId) && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/40 rounded-lg border border-border">
              <p className="col-span-2 text-xs font-semibold text-muted-foreground">
                {selectedCustomerId ? 'Datos del cliente' : 'Nuevo cliente — completa los datos'}
              </p>
              <div>
                <Label className="text-xs">Nombre</Label>
                <Input
                  value={customerFields.name}
                  onChange={e => setCustomerFields(f => ({ ...f, name: e.target.value }))}
                  className="bg-background border-border text-sm"
                  readOnly={!!selectedCustomerId}
                />
              </div>
              <div>
                <Label className="text-xs">Teléfono</Label>
                <Input
                  value={customerFields.phone}
                  onChange={e => setCustomerFields(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+56 9 1234 5678"
                  className="bg-background border-border text-sm"
                  readOnly={!!selectedCustomerId}
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  value={customerFields.email}
                  onChange={e => setCustomerFields(f => ({ ...f, email: e.target.value }))}
                  placeholder="cliente@email.com"
                  className="bg-background border-border text-sm"
                  readOnly={!!selectedCustomerId}
                />
              </div>
              <div>
                <Label className="text-xs">RUT</Label>
                <Input
                  value={customerFields.rut}
                  onChange={e => setCustomerFields(f => ({ ...f, rut: e.target.value }))}
                  placeholder="XX.XXX.XXX-X"
                  className="bg-background border-border text-sm"
                  readOnly={!!selectedCustomerId}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Dirección</Label>
                <Input
                  value={customerFields.address}
                  onChange={e => setCustomerFields(f => ({ ...f, address: e.target.value }))}
                  placeholder="Dirección"
                  className="bg-background border-border text-sm"
                  readOnly={!!selectedCustomerId}
                />
              </div>
            </div>
          )}
        </div>

        {/* Fechas y atendido */}
        <div className="grid grid-cols-3 gap-4 mt-3">
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-secondary border-border" />
          </div>
          <div>
            <Label>Válida hasta</Label>
            <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className="bg-secondary border-border" />
          </div>
          <div>
            <Label>Atendido por</Label>
            <Input value={form.attended_by} onChange={e => setForm(f => ({ ...f, attended_by: e.target.value }))} className="bg-secondary border-border" placeholder="Nombre" />
          </div>
        </div>

        {/* Ítems */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Ítems / Servicios</Label>
            <Button variant="outline" size="sm" onClick={addItem} className="gap-1 text-xs">
              <Plus className="h-3 w-3" /> Agregar
            </Button>
          </div>

          <div className="space-y-3">
            {form.items.map((item, idx) => (
              <div key={idx} className="bg-secondary/40 border border-border rounded-lg p-3 space-y-2">
                {/* Type toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => updateItem(idx, 'type', 'service')}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                      item.type === 'service' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-primary/20'
                    }`}
                  >
                    <Wrench className="h-3 w-3" /> Servicio / descripción
                  </button>
                  <button
                    onClick={() => updateItem(idx, 'type', 'product')}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                      item.type === 'product' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-primary/20'
                    }`}
                  >
                    <Package className="h-3 w-3" /> Producto inventario
                  </button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive ml-auto" onClick={() => removeItem(idx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Fields */}
                <div className="flex gap-2">
                  {item.type === 'product' ? (
                    <Select value={item.product_id} onValueChange={v => updateItem(idx, 'product_id', v)}>
                      <SelectTrigger className="bg-background border-border flex-1 text-sm">
                        <SelectValue placeholder="Seleccionar producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {(products || []).map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} — ${(p.sale_price || 0).toLocaleString('es-CL')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={item.description}
                      onChange={e => updateItem(idx, 'description', e.target.value)}
                      className="bg-background border-border flex-1 text-sm"
                      placeholder="Descripción del servicio o repuesto"
                    />
                  )}
                  <Input
                    type="number" min="1" value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                    className="w-16 bg-background border-border text-sm"
                    placeholder="Cant"
                  />
                  <Input
                    type="number" value={item.unit_price}
                    onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
                    className="w-28 bg-background border-border text-sm"
                    placeholder="Precio"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totales */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <Label>Mano de obra / Servicio</Label>
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

        <div className="mt-3">
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