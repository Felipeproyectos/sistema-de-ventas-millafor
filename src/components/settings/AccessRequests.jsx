import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function AccessRequests() {
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['access-requests'],
    queryFn: () => base44.entities.AccessRequest.list('-created_date'),
    refetchInterval: 30000,
  });

  const pending = requests.filter(r => r.status === 'pendiente');
  const handled = requests.filter(r => r.status !== 'pendiente');

  const handleApprove = async (req) => {
    setProcessing(req.id);
    await base44.users.inviteUser(req.email, 'user');
    await base44.entities.AccessRequest.update(req.id, { status: 'aprobado' });
    queryClient.invalidateQueries({ queryKey: ['access-requests'] });
    toast.success(`Acceso aprobado para ${req.full_name}`);
    setProcessing(null);
  };

  const handleReject = async (req) => {
    setProcessing(req.id);
    await base44.entities.AccessRequest.update(req.id, { status: 'rechazado' });
    queryClient.invalidateQueries({ queryKey: ['access-requests'] });
    toast.info(`Solicitud de ${req.full_name} rechazada`);
    setProcessing(null);
  };

  if (isLoading) return <div className="text-muted-foreground text-sm p-4">Cargando solicitudes...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">Solicitudes Pendientes</h3>
        <p className="text-xs text-muted-foreground mb-4">Aprueba o rechaza las solicitudes de acceso al sistema.</p>
        {pending.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">
            <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No hay solicitudes pendientes
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(req => (
              <div key={req.id} className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{req.full_name}</p>
                  <p className="text-xs text-muted-foreground">{req.email}</p>
                  {req.message && <p className="text-xs text-muted-foreground mt-1 italic">"{req.message}"</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(req.created_date).toLocaleDateString('es-CL')}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-destructive/50 text-destructive hover:bg-destructive/10"
                    disabled={processing === req.id}
                    onClick={() => handleReject(req)}
                  >
                    <X className="h-3.5 w-3.5" /> Rechazar
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={processing === req.id}
                    onClick={() => handleApprove(req)}
                  >
                    <Check className="h-3.5 w-3.5" /> Aprobar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {handled.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Historial</h3>
          <div className="space-y-2">
            {handled.map(req => (
              <div key={req.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3">
                <Badge variant={req.status === 'aprobado' ? 'default' : 'destructive'} className="text-xs">
                  {req.status === 'aprobado' ? 'Aprobado' : 'Rechazado'}
                </Badge>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-foreground font-medium">{req.full_name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{req.email}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}