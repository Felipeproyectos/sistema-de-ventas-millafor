import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users as UsersIcon, UserPlus, Shield, User, Mail } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from '../components/PageHeader';
import { toast } from "sonner";
import { useAuth } from '@/lib/AuthContext';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'user' });
  const [inviting, setInviting] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  async function load() {
    const u = await base44.entities.User.list();
    setUsers(u);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const handleInvite = async () => {
    if (!inviteForm.email) { toast.error('Ingresa un email'); return; }
    setInviting(true);
    await base44.users.inviteUser(inviteForm.email, inviteForm.role);
    toast.success(`Invitación enviada a ${inviteForm.email}`);
    setInviteForm({ email: '', role: 'user' });
    setInviting(false);
    setInviteOpen(false);
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <PageHeader title="Usuarios" description="Gestión de acceso a la aplicación">
        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" /> Invitar Usuario
          </Button>
        )}
      </PageHeader>

      {!isAdmin && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 text-sm text-warning">
          Solo el administrador puede invitar nuevos usuarios.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u => (
          <div key={u.id} className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
            <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base flex-shrink-0">
              {u.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">{u.full_name || '—'}</p>
                {u.id === currentUser?.id && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Tú</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                <Mail className="h-3 w-3" /> {u.email}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {u.role === 'admin' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">
                    <Shield className="h-3 w-3" /> Administrador
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-semibold">
                    <User className="h-3 w-3" /> Usuario
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Invite Dialog — only admin can open */}
      {isAdmin && (
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent className="bg-card border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" /> Invitar Usuario
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-xs text-muted-foreground">
                Se enviará un email con las instrucciones de acceso al correo indicado.
              </p>
              <div>
                <Label>Correo electrónico *</Label>
                <Input
                  type="email"
                  value={inviteForm.email}
                  onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  className="bg-secondary border-border"
                  placeholder="ejemplo@correo.com"
                />
              </div>
              <div>
                <Label>Rol</Label>
                <Select value={inviteForm.role} onValueChange={v => setInviteForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario (acceso normal)</SelectItem>
                    <SelectItem value="admin">Administrador (acceso completo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
                <Button onClick={handleInvite} disabled={inviting} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  {inviting ? 'Enviando...' : 'Enviar Invitación'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}