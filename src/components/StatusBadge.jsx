import { cn } from "@/lib/utils";

const statusStyles = {
  pendiente: "bg-warning/15 text-warning border-warning/20",
  en_proceso: "bg-primary/15 text-primary border-primary/20",
  finalizada: "bg-accent/15 text-accent border-accent/20",
  completada: "bg-accent/15 text-accent border-accent/20",
  cancelada: "bg-destructive/15 text-destructive border-destructive/20",
};

const statusLabels = {
  pendiente: "Pendiente",
  en_proceso: "En Proceso",
  finalizada: "Finalizada",
  completada: "Completada",
  cancelada: "Cancelada",
};

export default function StatusBadge({ status }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
      statusStyles[status] || "bg-muted text-muted-foreground border-border"
    )}>
      {statusLabels[status] || status}
    </span>
  );
}