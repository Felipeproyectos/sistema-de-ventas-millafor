import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Settings as SettingsIcon, Upload, Save } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from '../components/PageHeader';
import { toast } from "sonner";

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    company_name: '', logo_url: '', address: '', phone: '',
    email: '', website: '', tax_id: '', legal_rep: '', accent_color: '#3b82f6'
  });
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
      <PageHeader title="Configuración" description="Personaliza la información de tu empresa" />

      <div className="max-w-2xl">
        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          {/* Logo */}
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

          {/* Company Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Nombre de la Empresa *</Label>
              <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} className="bg-secondary border-border" />
            </div>
            <div>
              <Label>RUT/NIT</Label>
              <Input value={form.tax_id} onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))} className="bg-secondary border-border" />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-secondary border-border" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-secondary border-border" />
            </div>
            <div>
              <Label>Sitio Web</Label>
              <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className="bg-secondary border-border" />
            </div>
            <div className="sm:col-span-2">
              <Label>Representante Legal</Label>
              <Input value={form.legal_rep} onChange={e => setForm(f => ({ ...f, legal_rep: e.target.value }))} className="bg-secondary border-border" placeholder="Nombre completo del representante" />
            </div>
            <div className="sm:col-span-2">
              <Label>Dirección</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="bg-secondary border-border" />
            </div>
          </div>

          {/* Color */}
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
    </div>
  );
}