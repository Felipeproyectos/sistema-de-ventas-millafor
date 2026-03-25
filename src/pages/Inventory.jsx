import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Package, Plus, Search, AlertTriangle, Pencil, Trash2, Upload, History, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import BulkImportModal from '../components/BulkImportModal';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', barcode: '', stock: 0, purchase_price: 0, sale_price: 0, min_stock: 5, category: '', description: '' });
  const [bulkOpen, setBulkOpen] = useState(false);
  const [tab, setTab] = useState('products');

  async function load() {
    const [p, m] = await Promise.all([
      base44.entities.Product.list(),
      base44.entities.InventoryMovement.list('-created_date', 200),
    ]);
    setProducts(p);
    setMovements(m);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (editProduct) {
      setForm({
        name: editProduct.name || '', code: editProduct.code || '', barcode: editProduct.barcode || '',
        stock: editProduct.stock || 0, purchase_price: editProduct.purchase_price || 0,
        sale_price: editProduct.sale_price || 0, min_stock: editProduct.min_stock || 5,
        category: editProduct.category || '', description: editProduct.description || '',
      });
    } else {
      setForm({ name: '', code: '', barcode: '', stock: 0, purchase_price: 0, sale_price: 0, min_stock: 5, category: '', description: '' });
    }
  }, [editProduct, formOpen]);

  const handleSave = async () => {
    if (!form.name) { toast.error('El nombre es obligatorio'); return; }
    if (!form.code) { toast.error('El código es obligatorio'); return; }

    // Check barcode uniqueness
    if (form.barcode) {
      const duplicate = products.find(p => p.barcode === form.barcode && p.id !== editProduct?.id);
      if (duplicate) {
        toast.error(`El código de barras "${form.barcode}" ya está asignado a: ${duplicate.name}`);
        return;
      }
    }

    if (editProduct) {
      await base44.entities.Product.update(editProduct.id, form);
      toast.success('Producto actualizado');
    } else {
      await base44.entities.Product.create(form);
      toast.success('Producto creado');
    }
    setFormOpen(false);
    setEditProduct(null);
    load();
  };

  const handleDelete = async () => {
    await base44.entities.Product.delete(deleteId);
    setDeleteId(null);
    toast.success('Producto eliminado');
    load();
  };

  const filtered = products.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.code?.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMovements = movements.filter(m =>
    !search ||
    m.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.reference?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <PageHeader title="Inventario" description="Gestión de productos, stock y movimientos">
        <Button variant="outline" onClick={() => setBulkOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" /> Carga masiva
        </Button>
        <Button onClick={() => { setEditProduct(null); setFormOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo Producto
        </Button>
      </PageHeader>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, código o código de barras..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-card border-border"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-3.5 w-3.5" /> Productos ({products.length})
          </TabsTrigger>
          <TabsTrigger value="movements" className="gap-2">
            <History className="h-3.5 w-3.5" /> Movimientos ({movements.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState icon={Package} title="Sin productos" description="Agrega tu primer producto al inventario" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(p => (
                <div key={p.id} className={cn(
                  "bg-card border rounded-xl p-5 transition-all hover:border-primary/30",
                  (p.stock || 0) <= (p.min_stock || 5) ? "border-warning/30" : "border-border"
                )}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{p.name}</h3>
                      <p className="text-xs text-muted-foreground">Cód: {p.code}</p>
                      {p.barcode && (
                        <p className="text-xs text-primary/70 font-mono mt-0.5">
                          🔲 {p.barcode}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditProduct(p); setFormOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    {(p.stock || 0) <= (p.min_stock || 5) && <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                    <span className={cn("text-2xl font-bold", (p.stock || 0) <= (p.min_stock || 5) ? "text-warning" : "text-foreground")}>
                      {p.stock || 0}
                    </span>
                    <span className="text-xs text-muted-foreground">unidades</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-secondary/50 rounded-lg p-2">
                      <p className="text-muted-foreground">Compra</p>
                      <p className="font-semibold">${(p.purchase_price || 0).toLocaleString('es-CL')}</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-2">
                      <p className="text-muted-foreground">Venta</p>
                      <p className="font-semibold text-primary">${(p.sale_price || 0).toLocaleString('es-CL')}</p>
                    </div>
                  </div>
                  {p.category && <p className="text-[11px] text-muted-foreground mt-2">Categoría: {p.category}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          {filteredMovements.length === 0 ? (
            <EmptyState icon={History} title="Sin movimientos" description="Los movimientos aparecerán aquí al registrar ventas o ajustes" />
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Producto</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Cant.</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Stock antes → después</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Referencia</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Usuario</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMovements.map(m => (
                      <tr key={m.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="p-3">
                          {m.type === 'salida' ? (
                            <Badge variant="outline" className="gap-1 text-destructive border-destructive/30 bg-destructive/5">
                              <ArrowUpCircle className="h-3 w-3" /> Salida
                            </Badge>
                          ) : m.type === 'entrada' ? (
                            <Badge variant="outline" className="gap-1 text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30">
                              <ArrowDownCircle className="h-3 w-3" /> Entrada
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <SlidersHorizontal className="h-3 w-3" /> Ajuste
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 font-medium">{m.product_name}</td>
                        <td className="p-3 hidden sm:table-cell">{m.quantity}</td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">
                          {m.stock_before ?? '—'} → {m.stock_after ?? '—'}
                        </td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">{m.reference || '—'}</td>
                        <td className="p-3 hidden lg:table-cell text-muted-foreground text-xs">{m.user || '—'}</td>
                        <td className="p-3 text-muted-foreground text-xs">{m.date || m.created_date?.split('T')[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Product Form Dialog */}
      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditProduct(null); }}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="col-span-2">
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-secondary border-border" />
            </div>
            <div>
              <Label>Código *</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="bg-secondary border-border" />
            </div>
            <div>
              <Label>Código de Barras</Label>
              <Input
                value={form.barcode}
                onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
                className="bg-secondary border-border font-mono"
                placeholder="EAN, UPC, Code128..."
              />
            </div>
            <div>
              <Label>Stock</Label>
              <Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} className="bg-secondary border-border" />
            </div>
            <div>
              <Label>Stock mínimo</Label>
              <Input type="number" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: Number(e.target.value) }))} className="bg-secondary border-border" />
            </div>
            <div>
              <Label>Precio compra</Label>
              <Input type="number" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: Number(e.target.value) }))} className="bg-secondary border-border" />
            </div>
            <div>
              <Label>Precio venta</Label>
              <Input type="number" value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: Number(e.target.value) }))} className="bg-secondary border-border" />
            </div>
            <div>
              <Label>Categoría</Label>
              <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="bg-secondary border-border" />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-secondary border-border" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            El código de barras debe ser único. Compatible con EAN-8, EAN-13, UPC-A, Code 128, Code 39, QR y más.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setFormOpen(false); setEditProduct(null); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.code}>{editProduct ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkImportModal open={bulkOpen} onOpenChange={setBulkOpen} entityType="products" onSuccess={load} />
    </div>
  );
}