import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Download } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from '../components/PageHeader';
import { createPdfDoc, addTableHeader, checkPageBreak, formatCurrency } from '../lib/pdfUtils';

export default function Reports() {
  const [repairs, setRepairs] = useState([]);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    async function load() {
      const [r, s, p, cs] = await Promise.all([
        base44.entities.RepairOrder.list(),
        base44.entities.SaleOrder.list(),
        base44.entities.Product.list(),
        base44.entities.CompanySettings.list(),
      ]);
      setRepairs(r); setSales(s); setProducts(p);
      if (cs.length) setSettings(cs[0]);
      setLoading(false);
    }
    load();
  }, []);

  const filterByDate = (items) => {
    return items.filter(i => {
      if (dateFrom && i.date < dateFrom) return false;
      if (dateTo && i.date > dateTo) return false;
      return true;
    });
  };

  const generateRepairsReport = () => {
    const data = filterByDate(repairs);
    const { doc, y: startY, pageWidth } = createPdfDoc(settings, 'REPORTE DE REPARACIONES');
    let y = startY;

    doc.setFontSize(9);
    doc.text(`Total reparaciones: ${data.length}`, 15, y);
    doc.text(`Total facturado: ${formatCurrency(data.reduce((s, r) => s + (r.total || 0), 0))}`, pageWidth - 15, y, { align: 'right' });
    y += 8;

    y = addTableHeader(doc, y, [
      { label: 'Orden', x: 17 }, { label: 'Cliente', x: 42 }, { label: 'Equipo', x: 87 },
      { label: 'Estado', x: 127 }, { label: 'Total', x: 162 },
    ], pageWidth);

    doc.setFontSize(8);
    data.forEach(r => {
      y = checkPageBreak(doc, y);
      doc.text(`#${(r.order_number || r.id?.substring(0, 6))}`, 17, y);
      doc.text((r.customer_name || '-').substring(0, 20), 42, y);
      doc.text((r.machine_name || '-').substring(0, 18), 87, y);
      doc.text(r.status || '-', 127, y);
      doc.text(formatCurrency(r.total), 162, y);
      y += 5;
    });

    doc.save('reporte-reparaciones.pdf');
  };

  const generateSalesReport = () => {
    const data = filterByDate(sales);
    const { doc, y: startY, pageWidth } = createPdfDoc(settings, 'REPORTE DE VENTAS');
    let y = startY;

    doc.setFontSize(9);
    doc.text(`Total ventas: ${data.length}`, 15, y);
    doc.text(`Total facturado: ${formatCurrency(data.reduce((s, r) => s + (r.total || 0), 0))}`, pageWidth - 15, y, { align: 'right' });
    y += 8;

    y = addTableHeader(doc, y, [
      { label: 'Venta', x: 17 }, { label: 'Cliente', x: 50 }, { label: 'Fecha', x: 110 }, { label: 'Total', x: 162 },
    ], pageWidth);

    doc.setFontSize(8);
    data.forEach(s => {
      y = checkPageBreak(doc, y);
      doc.text(`#${(s.order_number || s.id?.substring(0, 6))}`, 17, y);
      doc.text((s.customer_name || '-').substring(0, 28), 50, y);
      doc.text(s.date || '-', 110, y);
      doc.text(formatCurrency(s.total), 162, y);
      y += 5;
    });

    doc.save('reporte-ventas.pdf');
  };

  const generateFinancialReport = () => {
    const repairData = filterByDate(repairs).filter(r => r.status === 'finalizada');
    const saleData = filterByDate(sales).filter(s => s.status === 'completada');
    const { doc, y: startY, pageWidth } = createPdfDoc(settings, 'REPORTE FINANCIERO');
    let y = startY;

    const repairRevenue = repairData.reduce((s, r) => s + (r.total || 0), 0);
    const saleRevenue = saleData.reduce((s, r) => s + (r.total || 0), 0);
    const saleCost = saleData.reduce((s, sale) =>
      s + (sale.items || []).reduce((is, item) => is + (item.quantity || 0) * (item.purchase_price || 0), 0), 0);
    const saleProfit = saleRevenue - saleCost;
    const totalRevenue = repairRevenue + saleRevenue;

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Resumen de Ingresos', 15, y); y += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Ingresos por reparaciones: ${formatCurrency(repairRevenue)}`, 20, y); y += 5;
    doc.text(`Ingresos por ventas: ${formatCurrency(saleRevenue)}`, 20, y); y += 5;
    doc.text(`Costo de productos vendidos: ${formatCurrency(saleCost)}`, 20, y); y += 5;
    doc.text(`Ganancia en ventas: ${formatCurrency(saleProfit)}`, 20, y); y += 5;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    y += 3;
    doc.text(`TOTAL INGRESOS: ${formatCurrency(totalRevenue)}`, 15, y); y += 5;
    doc.text(`GANANCIA ESTIMADA: ${formatCurrency(repairRevenue + saleProfit)}`, 15, y);

    doc.save('reporte-financiero.pdf');
  };

  const generatePurchaseReport = () => {
    const lowStock = products.filter(p => (p.stock || 0) <= (p.min_stock || 5));
    const { doc, y: startY, pageWidth } = createPdfDoc(settings, 'SOLICITUD DE COMPRAS');
    let y = startY;

    doc.setFontSize(9);
    doc.text(`Productos con stock bajo: ${lowStock.length}`, 15, y); y += 8;

    y = addTableHeader(doc, y, [
      { label: 'Producto', x: 17 }, { label: 'Código', x: 72 }, { label: 'Stock', x: 107 },
      { label: 'Mínimo', x: 127 }, { label: 'Costo unit.', x: 150 },
    ], pageWidth);

    doc.setFontSize(8);
    let totalCost = 0;
    lowStock.forEach(p => {
      y = checkPageBreak(doc, y);
      const needed = Math.max(0, (p.min_stock || 5) - (p.stock || 0));
      const cost = needed * (p.purchase_price || 0);
      totalCost += cost;
      doc.text((p.name || '-').substring(0, 25), 17, y);
      doc.text(p.code || '-', 72, y);
      doc.text(String(p.stock || 0), 107, y);
      doc.text(String(p.min_stock || 5), 127, y);
      doc.text(formatCurrency(p.purchase_price), 150, y);
      y += 5;
    });

    y += 8;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text(`Costo estimado de reposición: ${formatCurrency(totalCost)}`, 15, y);

    doc.save('solicitud-compras.pdf');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  const reportCards = [
    { title: 'Reporte de Reparaciones', desc: 'Todas las reparaciones realizadas con detalle', action: generateRepairsReport, color: 'bg-primary/10 text-primary' },
    { title: 'Reporte de Ventas', desc: 'Ventas de repuestos e insumos', action: generateSalesReport, color: 'bg-accent/10 text-accent' },
    { title: 'Reporte Financiero', desc: 'Resumen de ganancias y costos', action: generateFinancialReport, color: 'bg-warning/10 text-warning' },
    { title: 'Solicitud de Compras', desc: 'Productos faltantes y costo de reposición', action: generatePurchaseReport, color: 'bg-destructive/10 text-destructive' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Reportes" description="Genera reportes en PDF" />

      <div className="flex flex-col sm:flex-row gap-3 bg-card border border-border rounded-xl p-4">
        <div className="flex-1">
          <Label className="text-xs">Desde</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-secondary border-border" />
        </div>
        <div className="flex-1">
          <Label className="text-xs">Hasta</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-secondary border-border" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportCards.map((card, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-all">
            <div className={`h-10 w-10 rounded-lg ${card.color} flex items-center justify-center mb-4`}>
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">{card.title}</h3>
            <p className="text-xs text-muted-foreground mb-4">{card.desc}</p>
            <Button onClick={card.action} variant="outline" className="gap-2 w-full">
              <Download className="h-4 w-4" /> Generar PDF
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}