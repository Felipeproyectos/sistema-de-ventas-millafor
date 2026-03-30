import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

const UserNotRegisteredError = () => {
  const [form, setForm] = useState({ full_name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email) return;
    setSending(true);
    await base44.entities.AccessRequest.create({ ...form, status: 'pendiente' });
    setSent(true);
    setSending(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="max-w-md w-full p-8 bg-card rounded-xl shadow-lg border border-border">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-destructive/10">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0-6v2m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Acceso Restringido</h1>
          <p className="text-muted-foreground text-sm">
            Solo usuarios invitados pueden ingresar a este sistema.
          </p>
        </div>

        {sent ? (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
            <p className="text-primary font-semibold text-sm">¡Solicitud enviada!</p>
            <p className="text-muted-foreground text-xs mt-1">El administrador revisará tu solicitud y recibirás una invitación por email si es aprobada.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Solicitar acceso</p>
            <input
              type="text"
              placeholder="Nombre completo *"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              required
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <input
              type="email"
              placeholder="Email *"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <textarea
              placeholder="Motivo de la solicitud (opcional)"
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            <button
              type="submit"
              disabled={sending}
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {sending ? 'Enviando...' : 'Solicitar Acceso'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default UserNotRegisteredError;