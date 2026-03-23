import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLORS = ['hsl(217,91%,60%)', 'hsl(167,72%,48%)', 'hsl(43,96%,56%)', 'hsl(280,65%,60%)'];

function getMonthlyData(repairs, sales) {
  const months = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-CL', { month: 'short' });
    months[key] = { name: label, reparaciones: 0, ventas: 0 };
  }
  repairs.forEach(r => {
    if (!r.date) return;
    const key = r.date.substring(0, 7);
    if (months[key]) months[key].reparaciones++;
  });
  sales.forEach(s => {
    if (!s.date) return;
    const key = s.date.substring(0, 7);
    if (months[key]) months[key].ventas++;
  });
  return Object.values(months);
}

function getRepairStatusData(repairs) {
  const counts = { pendiente: 0, en_proceso: 0, finalizada: 0 };
  repairs.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
  return [
    { name: 'Pendiente', value: counts.pendiente },
    { name: 'En Proceso', value: counts.en_proceso },
    { name: 'Finalizada', value: counts.finalizada },
  ].filter(d => d.value > 0);
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-xl">
      <p className="text-xs font-medium text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: p.color }} />
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function DashboardCharts({ repairs, sales }) {
  const monthlyData = getMonthlyData(repairs, sales);
  const statusData = getRepairStatusData(repairs);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <Tabs defaultValue="monthly">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Actividad</h3>
          <TabsList className="bg-secondary">
            <TabsTrigger value="monthly" className="text-xs">Mensual</TabsTrigger>
            <TabsTrigger value="status" className="text-xs">Estado</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="monthly">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215,20%,55%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(215,20%,55%)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="reparaciones" fill="hsl(217,91%,60%)" radius={[4, 4, 0, 0]} name="Reparaciones" />
              <Bar dataKey="ventas" fill="hsl(167,72%,48%)" radius={[4, 4, 0, 0]} name="Ventas" />
            </BarChart>
          </ResponsiveContainer>
        </TabsContent>
        <TabsContent value="status">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                {statusData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {statusData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}