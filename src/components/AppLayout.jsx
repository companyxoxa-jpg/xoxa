import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getRinnoRole, isBusinessOwner, isSuperAdmin, isSupportMode, getSupportBusinessName, getBusinessId } from "@/lib/rinno";
import { CalendarDays, LayoutDashboard, ShoppingBag, Package, Users, Settings, Shield, LogOut, ArrowLeft, AlertCircle, Volume2, VolumeX, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrdersAlertProvider, useOrdersAlert } from "@/contexts/OrdersAlertContext";
import NewOrdersBanner from "@/components/business/NewOrdersBanner";
import DashboardSkin from "@/components/dashboard/DashboardSkin";
import { base44 } from "@/api/base44Client";
import { resolveBranding } from "@/lib/templates";
import { getDashboardShell } from "@/components/dashboard/skins/registry";
import { getNavItems } from "@/lib/dashboardNav";
import { getCachedBusiness, setCachedBusiness, onBusinessCacheInvalidation, invalidateAllBusinessCache } from "@/lib/businessCache";

const LOGO_URL = "https://media.base44.com/images/public/6ab02bee49c85daaead936e9/b507d6b8c_LOGOPANTALLADECARGA.png";

const navItems = [
  { label: "Inicio", path: "/panel", icon: LayoutDashboard },
  { label: "Pedidos", path: "/orders", icon: ShoppingBag },
  { label: "Productos", path: "/catalog", icon: Package },
  { label: "Agenda", path: "/agenda", icon: CalendarDays },
  { label: "Clientes", path: "/customers", icon: Users },
];

// Dashboard Business cache lives in @/lib/businessCache (module-level Map
// keyed by business_id, with explicit invalidation + cross-tab broadcast).
// The shell needs the Business record to resolve V2 branding (logo,
// template_id, colors); cached so navigation between dashboard pages doesn't
// refetch on every mount, and explicitly invalidated after a Super Admin save.
function useDashboardBusiness(bid) {
  const [business, setBusiness] = useState(() => getCachedBusiness(bid));
  useEffect(() => {
    if (!bid) { setBusiness(null); return; }
    let active = true;
    const cached = getCachedBusiness(bid);
    if (cached) { setBusiness(cached); }
    else {
      (async () => {
        try {
          const b = await base44.entities.Business.get(bid);
          if (!active) return;
          setCachedBusiness(bid, b);
          setBusiness(b);
        } catch { if (active) setBusiness(null); }
      })();
    }
    return () => { active = false; };
  }, [bid]);
  // Live refetch when this bid's cache is invalidated (same-tab save or
  // cross-tab BroadcastChannel), so branding/template changes surface without
  // a hard refresh even while the dashboard is mounted.
  useEffect(() => {
    if (!bid) return;
    let active = true;
    return onBusinessCacheInvalidation((invalidatedBid) => {
      if (invalidatedBid !== bid && invalidatedBid != null) return;
      (async () => {
        try {
          const b = await base44.entities.Business.get(bid);
          if (!active) return;
          setCachedBusiness(bid, b);
          setBusiness(b);
        } catch { if (active) setBusiness(null); }
      })();
    });
  }, [bid]);
  const branding = business ? resolveBranding(business) : null;
  return { business, branding };
}

function SoundToggle() {
  const { soundEnabled, setSoundEnabled } = useOrdersAlert();
  return (
    <button
      type="button"
      onClick={() => setSoundEnabled(!soundEnabled)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full transition-colors"
      title={soundEnabled ? "Sonido de pedidos activado" : "Sonido de pedidos desactivado"}
    >
      {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      <span>Sonido: {soundEnabled ? "on" : "off"}</span>
    </button>
  );
}

function AppLayoutInner() {
  const { user, logout, exitSupportMode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const supportMode = isSupportMode(user);
  const isOwner = isBusinessOwner(user);
  const isAdmin = isSuperAdmin(user);
  const { pendingCount, soundEnabled, setSoundEnabled } = useOrdersAlert();
  const bid = getBusinessId(user);
  const { business, branding } = useDashboardBusiness(bid);

  async function handleExitSupport() {
    await exitSupportMode();
    navigate("/command-center");
  }

  // V2 dashboard skin — resolve the shell from the registry. 'minimal' (and
  // any unregistered skin) returns null → the V1 chrome below renders. The
  // registry decides only which shell; getNavItems decides which nav it shows.
  const dbSkin = branding && branding.dashboard.skin;
  const Shell = business && dbSkin ? getDashboardShell(dbSkin) : null;
  if (Shell) {
    const v2Items = getNavItems({ skin: dbSkin, business, isOwner });
    return (
      <Shell
        branding={branding}
        items={v2Items}
        user={user}
        supportMode={supportMode}
        supportBusinessName={getSupportBusinessName(user)}
        onExitSupport={handleExitSupport}
        pendingCount={pendingCount}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onLogout={() => { invalidateAllBusinessCache(); logout(); }}
        getRole={getRinnoRole(user)?.replace(/_/g, " ")}
      >
        {dbSkin !== 'associationops' && (!isAdmin || supportMode) && <NewOrdersBanner />}
        <Outlet />
      </Shell>
    );
  }

  const items = isAdmin && !supportMode
    ? [{ label: "Command Center", path: "/command-center", icon: Shield }]
    : [
        ...navItems,
        ...(isOwner ? [{ label: "Importar datos", path: "/initial-import", icon: Upload }] : []),
        ...(isOwner ? [{ label: "Más", path: "/settings", icon: Settings }] : []),
      ];

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[260px] bg-sidebar border-r border-sidebar-border flex-col">
        <div className="px-6 py-5 border-b border-sidebar-border">
          <Link to="/panel" className="flex items-center gap-2.5">
            <img src={LOGO_URL} alt="RINNO" className="w-9 h-9 rounded-xl object-contain" />
            <div>
              <p className="font-heading font-bold text-foreground leading-none text-lg">RINNO</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Business OS</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg shadow-primary/25" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}>
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
                {item.path === "/orders" && pendingCount > 0 && (
                  <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1.5 rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium text-foreground truncate">{user?.email}</p>
            <p className="text-[11px] text-muted-foreground capitalize">{getRinnoRole(user)?.replace(/_/g, " ")}</p>
          </div>
          {(!isAdmin || supportMode) && <SoundToggle />}
          <button onClick={() => { invalidateAllBusinessCache(); logout(); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-sidebar-accent w-full transition-colors">
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-30 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <Link to="/panel" className="flex items-center gap-2">
          <img src={LOGO_URL} alt="RINNO" className="w-8 h-8 rounded-lg object-contain" />
          <span className="font-heading font-bold text-foreground">RINNO</span>
        </Link>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Link to="/orders" className="flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              <ShoppingBag className="w-3 h-3" />
              {pendingCount}
            </Link>
          )}
          <span className="text-xs text-muted-foreground capitalize px-2.5 py-1 rounded-full bg-muted">
            {supportMode ? "Soporte" : getRinnoRole(user)?.replace(/_/g, " ")}
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="md:ml-[260px] min-h-screen pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-0">
        {supportMode && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between relative z-20">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-sm font-medium text-amber-400 truncate">
                Modo soporte · {getSupportBusinessName(user) || "Negocio"}
              </p>
            </div>
            <button onClick={handleExitSupport} className="flex items-center gap-1.5 text-sm font-semibold text-amber-400 hover:text-amber-300 shrink-0">
              <ArrowLeft className="w-4 h-4" />
              Salir
            </button>
          </div>
        )}
        {(!isAdmin || supportMode) && <NewOrdersBanner />}
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }} className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-sidebar border-t border-sidebar-border flex items-center justify-around gap-1 px-1 py-2 overflow-x-auto">
        {items.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className={cn(
              "relative flex flex-col items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}>
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {item.path === "/orders" && pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-amber-500 text-white text-[9px] font-bold min-w-[15px] h-[15px] px-1 rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </div>
              <span className="truncate max-w-[56px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function AppLayout() {
  return (
    <OrdersAlertProvider>
      <DashboardSkin>
        <AppLayoutInner />
      </DashboardSkin>
    </OrdersAlertProvider>
  );
}
