import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const DEFAULT_BG = 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80';

const UserNotRegisteredError = () => {
  const [form, setForm] = useState({ full_name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    base44.entities.CompanySettings.list().then(data => {
      if (data && data.length > 0) setSettings(data[0]);
    });
  }, []);

  const bgImage = settings?.bg_image_url || DEFAULT_BG;
  const logo = settings?.logo_url;
  const companyName = settings?.company_name || 'Sistema de Gestión';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email) return;
    setSending(true);
    await base44.entities.AccessRequest.create({ ...form, status: 'pendiente' });
    setSent(true);
    setSending(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundImage: `url('${bgImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay oscuro */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo y nombre */}
        <div className="text-center mb-8">
          {logo ? (
            <img src={logo} alt={companyName} className="h-16 mx-auto mb-3 object-contain drop-shadow-lg" />
          ) : (
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-primary-foreground">{companyName[0]}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-white tracking-tight">{companyName}</h1>
          <p className="text-white/60 text-sm mt-1">Sistema de Gestión Empresarial</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-yellow-400/20 border border-yellow-400/40">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0-6v2m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Acceso Restringido</h2>
            <p className="text-white/60 text-sm">Solo usuarios invitados pueden ingresar a este sistema.</p>
          </div>

          {sent ? (
            <div className="bg-green-500/20 border border-green-500/40 rounded-xl p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-green-500/30 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white font-semibold text-sm">¡Solicitud enviada correctamente!</p>
              <p className="text-white/60 text-xs mt-1">El administrador revisará tu solicitud y recibirás una invitación por email si es aprobada.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-4">Solicitar Acceso</p>
              <input
                type="text"
                placeholder="Nombre completo *"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 transition"
              />
              <input
                type="email"
                placeholder="Email *"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 transition"
              />
              <textarea
                placeholder="Motivo de la solicitud (opcional)"
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 transition resize-none"
              />
              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary/30 disabled:opacity-60"
              >
                {sending ? 'Enviando...' : 'Solicitar Acceso'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          ¿Ya tienes acceso?{' '}
          <button onClick={() => base44.auth.redirectToLogin()} className="text-white/60 hover:text-white underline transition">
            Iniciar sesión
          </button>
        </p>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;