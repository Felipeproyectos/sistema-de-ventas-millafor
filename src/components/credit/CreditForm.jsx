import { useState } from 'react';
import { Search } from 'lucide-react';

export default function CreditForm({ initialData, onSave, onCancel, customers = [] }) {
  const [clientTab, setClientTab] = useState('new');
  const [customerSearch, setCustomerSearch] = useState('');
  const [form, setForm] = useState({
    client_name: initialData?.client_name || '',
    client_phone: initialData?.client_phone || '',
    client_email: initialData?.client_email || '',
    client_rut: initialData?.client_rut || '',
    service_date: initialData?.service_date || new Date().toISOString().split('T')[0],
    description: initialData?.description || '',
    total_amount: initialData?.total_amount || '',
    amount_paid: initialData?.amount_paid || 0,
    due_date: initialData?.due_date || '',
    status: initialData?.status || 'pendiente',
    notes: initialData?.notes || ''
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, total_amount: parseFloat(form.total_amount) || 0, amount_paid: parseFloat(form.amount_paid) || 0 });
  };

  const handleSelectCustomer = (customer) => {
    setForm(f => ({
      ...f,
      client_name: customer.name || '',
      client_phone: customer.phone || '',
      client_email: customer.email || '',
      client_rut: customer.rut || '',
    }));
    setClientTab('new');
  };

  const filteredCustomers = customers.filter(c => {
    const q = customerSearch.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.phone || '').includes(q);
  });

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Datos del Cliente</p>

        {customers.length > 0 && (
          <div className="flex gap-1 mb-3 bg-secondary/50 p-1 rounded-lg">
            <button type="button" onClick={() => setClientTab('existing')}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${clientTab === 'existing' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              Cliente existente
            </button>
            <button type="button" onClick={() => setClientTab('new')}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${clientTab === 'new' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              Ingresar datos
            </button>
          </div>
        )}

        {clientTab === 'existing' && customers.length > 0 ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                placeholder="Buscar cliente..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredCustomers.map(c => (
                <button key={c.id} type="button" onClick={() => handleSelectCustomer(c)}
                  className="w-full text-left px-3 py-2 bg-background border border-border rounded-lg text-sm hover:border-primary/50 hover:bg-primary/5 transition-colors">
                  <p className="font-medium text-foreground">{c.name}</p>
                  {(c.phone || c.email) && <p className="text-xs text-muted-foreground">{[c.phone, c.email].filter(Boolean).join(' · ')}</p>}
                </button>
              ))}
              {filteredCustomers.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Sin resultados</p>}
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Nombre *</label>
            <input required value={form.client_name} onChange={e => set('client_name', e.target.value)} className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">RUT</label>
            <input value={form.client_rut} onChange={e => set('client_rut', e.target.value)} className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Teléfono</label>
            <input value={form.client_phone} onChange={e => set('client_phone', e.target.value)} className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <input type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Producto / Servicio</p>
        <div>
          <label className="text-xs text-muted-foreground">Fecha del servicio *</label>
          <input required type="date" value={form.service_date} onChange={e => set('service_date', e.target.value)} className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Descripción *</label>
          <textarea required value={form.description} onChange={e => set('description', e.target.value)} rows={2} className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Montos y Vencimiento</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Monto Total *</label>
            <input required type="number" min="0" value={form.total_amount} onChange={e => set('total_amount', e.target.value)} className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Monto Abonado</label>
            <input type="number" min="0" value={form.amount_paid} onChange={e => set('amount_paid', e.target.value)} className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Fecha de Vencimiento *</label>
            <input required type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Estado</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Notas</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">Cancelar</button>
        <button type="submit" className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Guardar</button>
      </div>
    </form>
  );
}