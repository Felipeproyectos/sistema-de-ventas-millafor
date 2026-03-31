import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Settings as SettingsIcon, Upload, Save, FileText, FileCheck, UserCog, History, Users, Monitor, ShieldCheck } from 'lucide-react';
import AccessRequests from '../components/settings/AccessRequests';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from '../components/PageHeader';
import { toast } from "sonner";
import Reports from './Reports';
import Templates from './Templates';
import UsersPage from './Users';
import HistoryPage from './HistoryPage';
import Customers from './Customers';
import Machines from './Machines';

const tabs = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'access', label: 'Accesos', icon: ShieldCheck },
  { id: 'reports', label: 'Reportes', icon: FileText },
  { id: 'templates', label: 'Plantillas', icon: FileCheck },
  { id: 'users', label: 'Usuarios', icon: UserCog },
  { id: 'history', label: 'Historial', icon: History },
  { id: 'customers', label: 'Clientes', icon: Users },
  { id: 'machines', label: 'Equipos', icon: Monitor },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['access-requests'],
    queryFn: () => base44.entities.AccessRequest.filter({ status: 'pendiente' }),
    refetchInterval: 30000,
  });
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    company_name: '', logo_url: '', bg_image_url: '', address: '', phone: '',
    email: '', website: '', tax_id: '', legal_rep: '', accent_color: '#3b82f6'
  });
  const [uploadingBg, setUploadingBg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function load() {
      const s = await base44.entities.CompanySettings.list();
      if (s.length) {
        setSettings(s[0]);
        setForm({
          company_name: s[0].company_name || '',
          logo_url: s[0].logo_url || '',
          bg_image_url: s[0].bg_image_url || '',
          address: s[0].address || '',
          phone: s[0].phone || '',
          email: s[0].email || '',
          website: s[0].website || '',
          tax_id: s[0].tax_id || '',
          legal_rep: s[0].legal_rep || '',
          accent_color: s[0].accent_color || '#3b82f6',
        });
      }
    }
    load();
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, logo_url: file_url }));
    setUploading(false);
    toast.success('Logo subido');
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, bg_image_url: file_url }));
    setUploadingBg(false);
    toast.success('Imagen de fondo subida');
  };

  const handleSave = async () => {
    if (!form.company_name) { toast.error('El nombre de la empresa es obligatorio'); return; }
    setSaving(true);
    if (settings) {
      await base44.entities.CompanySettings.update(settings.id, form);
    } else {
      const created = await base44.entities.CompanySettings.create(form);
      setSettings(created);
    }
    toast.success('Configuración guardada');
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" description="Administra todas las opciones del sistema" />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-secondary/50 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.id === 'access' && pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'general' && (
        <div className="max-w-2xl">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <div>
              <Label className="text-sm font-semibold mb-3 block">Logo de la Empresa</Label>
              <div className="flex items-center gap-4">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="h-16 w-16 rounded-xl object-cover border border-border" />
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-secondary flex items-center justify-center">
                    <SettingsIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors">
                      <Upload className="h-4 w-4" />
                      {uploading ? 'Subiendo...' : 'Subir Logo'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold mb-3 block">Imagen de Fondo (pantalla de acceso)</Label>
              <div className="flex items-center gap-4">
                {form.bg_image_url ? (
                  <img src={form.bg_image_url} alt="Fondo" className="h-16 w-24 rounded-xl object-cover border border-border" />
                ) : (
                  <div className="h-16 w-24 rounded-xl bg-secondary flex items-center justify-center">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors">
                      <Upload className="h-4 w-4" />
                      {uploadingBg ? 'Subiendo...' : 'Subir Imagen'}
                    </span>
                  </label>
                  {form.bg_image_url && (
                    <button onClick={() => setForm(f => ({ ...f, bg_image_url: '' }))} className="text-xs text-destructive hover:underline block">Eliminar</button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Esta imagen se muestra como fondo en la pantalla de acceso restringido.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Nombre de la Empresa *</Label>
                <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} className="bg-secondary border-border" />
              </div>
              <div className="sm:col-span-2">
                <Label>Representante Legal</Label>
                <Input value={form.legal_rep} onChange={e => setForm(f => ({ ...f, legal_rep: e.target.value }))} className="bg-secondary border-border" placeholder="Nombre completo del representante" />
              </div>
              <div>
                <Label>RUT</Label>
                <Input value={form.tax_id} onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))} className="bg-secondary border-border" />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-secondary border-border" />
              </div>
              <div className="sm:col-span-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-secondary border-border" />
              </div>
              <div className="sm:col-span-2">
                <Label>Dirección</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="bg-secondary border-border" />
              </div>
            </div>
            <div>
              <Label>Color de Acento</Label>
              <div className="flex items-center gap-3 mt-1">
                <input type="color" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="h-10 w-10 rounded-lg border border-border cursor-pointer" />
                <Input value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="bg-secondary border-border w-32" />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </div>
      )}
      {activeTab === 'access' && <AccessRequests />}
      {activeTab === 'reports' && <Reports />}
      {activeTab === 'templates' && <Templates />}
      {activeTab === 'users' && <UsersPage />}
      {activeTab === 'history' && <HistoryPage />}
      {activeTab === 'customers' && <Customers />}
      {activeTab === 'machines' && <Machines />}
    </div>
  );
}