import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from "@/lib/utils";

const navItems = [
{ path: '/', label: 'Dashboard', icon: LayoutDashboard },
{ path: '/repairs', label: 'Reparaciones', icon: Wrench },
{ path: '/inventory', label: 'Inventario', icon: Package },
{ path: '/sales', label: 'Ventas', icon: ShoppingCart },
{ path: '/customers', label: 'Clientes', icon: Users },
{ path: '/machines', label: 'Equipos', icon: Monitor },
{ path: '/history', label: 'Historial', icon: History },
{ path: '/reports', label: 'Reportes', icon: FileText },
{ path: '/templates', label: 'Plantillas', icon: FileCheck },
{ path: '/settings', label: 'Configuración', icon: Settings }];


export default function AppLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {mobileOpen &&
      <div
        className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
        onClick={() => setMobileOpen(false)} />

      }

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 h-screen z-50 flex flex-col border-r border-border bg-sidebar transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo area */}
        <div className={cn(
          "h-16 flex items-center border-b border-border px-4",
          collapsed ? "justify-center" : "gap-3"
        )}>
          <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          {!collapsed &&
          <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-foreground truncate">MILLAFOR</h1>
              <p className="text-[10px] text-muted-foreground">Gestión de Servicios</p>
            </div>
          }
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto lg:hidden text-muted-foreground hover:text-foreground">
            
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  collapsed && "justify-center px-0",
                  isActive ?
                  "bg-primary/15 text-primary" :
                  "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
                title={collapsed ? item.label : undefined}>
                
                <item.icon className={cn("h-[18px] w-[18px] flex-shrink-0", isActive && "text-primary")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>);

          })}
        </nav>

        {/* User info */}
        {user && (
          <div className={cn(
            "border-t border-border px-3 py-3",
            collapsed ? "flex justify-center" : ""
          )}>
            {!collapsed ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                  {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{user.full_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate capitalize">{user.role || 'usuario'}</p>
                </div>
                <button
                  onClick={() => base44.auth.logout()}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Cerrar sesión"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
              </div>
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
        )}

        {/* Collapse button */}
        <div className="hidden lg:flex p-3 border-t border-border">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 lg:hidden h-14 bg-background/80 backdrop-blur-xl border-b border-border flex items-center px-4">
          <button onClick={() => setMobileOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 font-semibold text-sm">ServicePro</span>
        </div>
        <div className="p-4 lg:p-8 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>);

}