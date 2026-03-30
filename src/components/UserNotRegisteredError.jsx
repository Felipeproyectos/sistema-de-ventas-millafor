import React from 'react';

const UserNotRegisteredError = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="max-w-md w-full p-8 bg-card rounded-xl shadow-lg border border-border">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-destructive/10">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0-6v2m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Acceso Restringido</h1>
          <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
            Solo usuarios invitados pueden ingresar a este sistema.<br />
            Si crees que deberías tener acceso, contacta al administrador.
          </p>
          <div className="p-4 bg-secondary/50 rounded-lg text-sm text-muted-foreground text-left">
            <p className="font-medium text-foreground mb-2">¿Qué puedes hacer?</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Verificar que estás usando la cuenta correcta</li>
              <li>Solicitar acceso al administrador del sistema</li>
              <li>Cerrar sesión e intentar con otra cuenta</li>
            </ul>
          </div>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="mt-6 w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;