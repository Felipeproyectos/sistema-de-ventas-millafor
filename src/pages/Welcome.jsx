import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

const DEFAULT_BG = 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80';

export default function Welcome() {
  const [settings, setSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (authed) navigate('/', { replace: true });
    });
    base44.entities.CompanySettings.list().then(data => {
      if (data && data.length > 0) setSettings(data[0]);
      setLoadingSettings(false);
    });
  }, []);

  const bgImage = settings?.bg_image_url || DEFAULT_BG;
  const logo = settings?.logo_url;
  const companyName = settings?.company_name || 'Sistema de Gestión';

  if (loadingSettings) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundColor: '#0a0f1e',
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      />

      <div className="relative z-10 w-full max-w-sm mx-4 text-center">
        <div className="mb-8">
          {logo ? (
            <img src={logo} alt={companyName} className="h-24 mx-auto mb-4 object-contain drop-shadow-2xl" />
          ) : (
            <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-blue-600 flex items-center justify-center shadow-2xl">
              <span className="text-4xl font-bold text-white">{companyName[0]}</span>
            </div>
          )}
          <h1 className="text-3xl font-bold text-white tracking-tight">{companyName}</h1>
          <p className="text-white/50 text-sm mt-2">Tu máquina en las mejores manos</p>
        </div>

        <div
          className="rounded-2xl p-6 shadow-2xl border"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(255,255,255,0.15)',
          }}
        >
          <p className="text-white/70 text-sm mb-5">
            Bienvenido. Inicia sesión para acceder al sistema.
          </p>
          <Button
            onClick={() => base44.auth.redirectToLogin()}
            className="w-full py-5 text-base gap-2 font-semibold"
            style={{ background: '#3b82f6' }}
          >
            <LogIn className="h-5 w-5" />
            Ingresar al Sistema
          </Button>
        </div>
      </div>
    </div>
  );
}