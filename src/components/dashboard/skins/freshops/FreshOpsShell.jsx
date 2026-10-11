import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LogOut, Volume2, VolumeX } from "lucide-react";
import { SupportBanner, ShellLogo } from "@/components/dashboard/primitives";

const TYPO = { display: "font-display", heading: "font-heading", body: "font-body" };

// Template Engine V2 — Dashboard · Fresh Ops (freshops skin).
// The operational shell for food / fruit-store commerce. Wraps the existing
// pages (Outlet via children) with a frutería-specific chrome that responds to
// dashboard typography / logoPlacement / logoSize / navigationVariant /
// headerVariant / density / tokens. RINNO keeps a discreet secondary brand.
export default function FreshOpsShell({ branding, items, user, supportMode, supportBusinessName, onExitSupport, pendingCount, soundEnabled, onToggleSound, onLogout, getRole, children }) {
  const location = useLocation();
  const db = branding.dashboard;
  const color = branding.shared.primaryColor;
  const secondary = branding.shared.secondaryColor;
  const accent = (db.tokens && db.tokens.accent) || secondary;
  const headFont = TYPO[db.typography.heading] || "font-heading";
  const logoPx = { sm: 32, md: 40 }[db.logoSize] || 32;
  const compact = db.headerVariant === "compact";
  const dense = db.density === "compact";
  const navTop = db.navigationVariant === "top";
  const logoSide = db.logoPlacement === "sidebar" && !navTop;
  const logoTop = db.logoPlacement === "top" && navTop;

  function NavItem({ item, active }) {
    const Icon = item.icon;
    return (
      <Link to={item.path} className={cn("flex items-center gap-3 rounded-lg font-medium transition-colors", dense ? "px-3 py-2 text-sm" : "px-3 py-2.5 text-sm", active ? "text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60")} style={active ? { background: `linear-gradient(to right, ${color}, ${secondary})` } : {}}>
        <Icon className="w-[18px] h-[18px] shrink-0" />
        <span className="truncate">{item.label}</span>
        {item.path === "/orders" && pendingCount > 0 && <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">{pendingCount}</span>}
      </Link>
    );
  }

  const supportBanner = <SupportBanner supportMode={supportMode} supportBusinessName={supportBusinessName} onExitSupport={onExitSupport} />;

  const sidebar = !navTop && (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[248px] bg-sidebar border-r border-sidebar-border flex-col">
      <div className={cn("px-5 border-b border-sidebar-border flex items-center gap-2.5", compact ? "py-3" : "py-4")}>
        {logoSide && <ShellLogo branding={branding} size={logoPx} radiusClass="rounded-lg" />}
        <div className="min-w-0"><p className={`${headFont} font-bold text-foreground leading-none truncate`}>{branding.shared.businessName || "RINNO"}</p><p className="text-[10px] text-muted-foreground mt-0.5">Panel · <span style={{ color: accent }}>RINNO</span></p></div>
      </div>
      <nav className={cn("flex-1 px-3 overflow-y-auto", dense ? "py-2 space-y-0.5" : "py-4 space-y-1")}>{items.map(it => <NavItem key={it.path} item={it} active={location.pathname === it.path} />)}</nav>
      <div className="px-3 py-3 border-t border-sidebar-border space-y-1">
        <div className="px-3 py-2 mb-1"><p className="text-xs font-medium text-foreground truncate">{user?.email}</p><p className="text-[11px] text-muted-foreground capitalize">{getRole}</p></div>
        {soundEnabled !== undefined && <button onClick={onToggleSound} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent w-full">{soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}Sonido: {soundEnabled ? "on" : "off"}</button>}
        <button onClick={onLogout} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent w-full"><LogOut className="w-4 h-4" />Cerrar sesión</button>
      </div>
    </aside>
  );

  const topbar = navTop && (
    <header className="hidden md:flex sticky top-0 z-30 bg-sidebar border-b border-sidebar-border items-center gap-4 px-5" style={{ minHeight: compact ? 52 : 60 }}>
      {logoTop ? <ShellLogo branding={branding} size={logoPx} radiusClass="rounded-lg" /> : <span className={`${headFont} font-bold text-foreground`}>RINNO</span>}
      <span className="text-border">·</span>
      <span className="text-sm text-muted-foreground truncate">{branding.shared.businessName}</span>
      <nav className={cn("flex items-center ml-auto", dense ? "gap-0.5" : "gap-1")}>{items.map(it => <NavItem key={it.path} item={it} active={location.pathname === it.path} />)}</nav>
      <div className="flex items-center gap-3 pl-3 border-l border-sidebar-border"><span className="text-xs text-muted-foreground capitalize">{getRole}</span><button onClick={onLogout} className="text-muted-foreground hover:text-foreground"><LogOut className="w-4 h-4" /></button></div>
    </header>
  );

  const mobileHeader = (
    <header className="md:hidden sticky top-0 z-30 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0"><ShellLogo branding={branding} size={28} radiusClass="rounded-lg" /><span className={`${headFont} font-bold text-foreground truncate`}>{branding.shared.businessName || "RINNO"}</span></div>
      <div className="flex items-center gap-2">
        {pendingCount > 0 && <Link to="/orders" className="flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">{pendingCount}</Link>}
        <span className="text-xs text-muted-foreground capitalize px-2.5 py-1 rounded-full bg-muted">{supportMode ? "Soporte" : getRole}</span>
      </div>
    </header>
  );

  const bottomNav = (
    <nav style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }} className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-sidebar border-t border-sidebar-border flex items-center justify-around gap-1 px-1 py-2 overflow-x-auto">
      {items.map(it => {
        const active = location.pathname === it.path;
        const Icon = it.icon;
        return (
          <Link key={it.path} to={it.path} className={cn("relative flex flex-col items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors", active ? "text-primary" : "text-muted-foreground")} style={active ? { color } : {}}>
            <div className="relative"><Icon className="w-5 h-5" />{it.path === "/orders" && pendingCount > 0 && <span className="absolute -top-1.5 -right-2 bg-amber-500 text-white text-[9px] font-bold min-w-[15px] h-[15px] px-1 rounded-full flex items-center justify-center">{pendingCount}</span>}</div>
            <span className="truncate max-w-[56px]">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {sidebar}
      {topbar}
      {mobileHeader}
      <main className={cn("min-h-screen pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-0", !navTop ? "md:ml-[248px]" : "")}>
        {supportBanner}
        {children}
      </main>
      {bottomNav}
    </div>
  );
}