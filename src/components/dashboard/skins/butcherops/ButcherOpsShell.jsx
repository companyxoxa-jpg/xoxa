import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LogOut, Volume2, VolumeX } from "lucide-react";
import { SupportBanner, ShellLogo } from "@/components/dashboard/primitives";

const TYPO = { display: "font-display", heading: "font-heading", body: "font-body" };

// Template Engine V2 — Dashboard · Mostrador Ops (butcherops skin).
// A denser, operations-first shell: a horizontal command bar (or an icon rail)
// instead of FreshOps' sidebar. Same prop contract so AppLayout swaps it in
// without touching permissions, alerts, or data.
export default function ButcherOpsShell({ branding, items, user, supportMode, supportBusinessName, onExitSupport, pendingCount, soundEnabled, onToggleSound, onLogout, getRole, children }) {
  const location = useLocation();
  const db = branding.dashboard;
  const secondary = branding.shared.secondaryColor;
  const accent = (db.tokens && db.tokens.accent) || secondary;
  const headFont = TYPO[db.typography.heading] || "font-heading";
  const logoPx = { sm: 30, md: 36 }[db.logoSize] || 30;
  const compact = db.headerVariant === "compact";
  const dense = db.density === "compact";
  const rail = db.navigationVariant === "rail";
  const logoInBar = db.logoPlacement === "top" && !rail;

  function CommandPill({ item, active }) {
    const Icon = item.icon;
    return (
      <Link to={item.path} className={cn("relative flex items-center gap-2 rounded-md font-medium transition-colors whitespace-nowrap", dense ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm", active ? "text-white" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60")} style={active ? { backgroundColor: accent } : {}}>
        <Icon className="w-[16px] h-[16px] shrink-0" />
        <span className="hidden xl:inline">{item.label}</span>
        <span className="xl:hidden">{item.label}</span>
        {item.path === "/orders" && pendingCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[9px] font-bold min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center border-2 border-sidebar">{pendingCount}</span>}
      </Link>
    );
  }

  function RailItem({ item, active }) {
    const Icon = item.icon;
    return (
      <Link to={item.path} className={cn("relative flex flex-col items-center justify-center rounded-lg transition-colors", dense ? "py-1.5" : "py-2", active ? "text-white" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60")} style={active ? { backgroundColor: accent } : {}} title={item.label}>
        <Icon className="w-5 h-5" />
        {item.path === "/orders" && pendingCount > 0 && <span className="absolute top-0 right-0 bg-amber-500 text-white text-[8px] font-bold min-w-[14px] h-[14px] px-0.5 rounded-full flex items-center justify-center">{pendingCount}</span>}
      </Link>
    );
  }

  const supportBanner = <SupportBanner supportMode={supportMode} supportBusinessName={supportBusinessName} onExitSupport={onExitSupport} />;

  return (
    <div className="min-h-screen bg-background">
      {supportBanner}

      {/* Rail (desktop) */}
      {rail && (
        <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[68px] bg-sidebar border-r border-sidebar-border flex-col items-center py-3 gap-1 z-30">
          <div className="mb-2"><ShellLogo branding={branding} size={logoPx} radiusClass="rounded-md" /></div>
          <div className="w-8 border-t border-sidebar-border mb-2" />
          {items.map(it => <RailItem key={it.path} item={it} active={location.pathname === it.path} />)}
          <button onClick={onLogout} className="mt-auto text-muted-foreground hover:text-foreground"><LogOut className="w-5 h-5" /></button>
        </aside>
      )}

      {/* Command bar (desktop) */}
      {!rail && (
        <header className="hidden md:flex sticky top-0 z-30 bg-sidebar border-b border-sidebar-border items-center gap-3 px-4" style={{ minHeight: compact ? 52 : 60 }}>
          {logoInBar ? <ShellLogo branding={branding} size={logoPx} radiusClass="rounded-md" /> : <span className={`${headFont} font-bold text-foreground text-sm`}>RINNO</span>}
          <span className="text-border">·</span>
          <span className="text-sm text-muted-foreground truncate hidden lg:inline">{branding.shared.businessName}</span>
          <nav className={cn("flex items-center gap-1 ml-auto overflow-x-auto", dense && "gap-0.5")}>
            {items.map(it => <CommandPill key={it.path} item={it} active={location.pathname === it.path} />)}
          </nav>
          <div className="flex items-center gap-2 pl-3 border-l border-sidebar-border">
            {soundEnabled !== undefined && <button onClick={onToggleSound} className="text-muted-foreground hover:text-foreground" title={soundEnabled ? "Sonido on" : "Sonido off"}>{soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}</button>}
            <span className="text-xs text-muted-foreground capitalize hidden lg:inline">{getRole}</span>
            <button onClick={onLogout} className="text-muted-foreground hover:text-foreground"><LogOut className="w-4 h-4" /></button>
          </div>
        </header>
      )}

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-30 bg-sidebar border-b border-sidebar-border px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0"><ShellLogo branding={branding} size={26} radiusClass="rounded-md" /><span className={`${headFont} font-bold text-foreground truncate text-sm`}>{branding.shared.businessName || "RINNO"}</span></div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && <Link to="/orders" className="flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">{pendingCount}</Link>}
          {soundEnabled !== undefined && <button onClick={onToggleSound} className="text-muted-foreground">{soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}</button>}
          <button onClick={onLogout} className="text-muted-foreground"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>

      {/* Mobile scrollable top tab bar (NOT a bottom nav like FreshOps) */}
      <nav className="md:hidden sticky top-[49px] z-20 bg-sidebar/95 backdrop-blur border-b border-sidebar-border flex items-center gap-1 px-2 py-1.5 overflow-x-auto">
        {items.map(it => {
          const active = location.pathname === it.path;
          const Icon = it.icon;
          return (
            <Link key={it.path} to={it.path} className={cn("relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors", active ? "text-white" : "text-muted-foreground")} style={active ? { backgroundColor: accent } : {}}>
              <Icon className="w-3.5 h-3.5" />
              {it.label}
              {it.path === "/orders" && pendingCount > 0 && <span className="ml-1 bg-amber-500 text-white text-[9px] font-bold min-w-[14px] h-[14px] px-0.5 rounded-full flex items-center justify-center">{pendingCount}</span>}
            </Link>
          );
        })}
      </nav>

      <main className={cn("min-h-screen pb-6 md:pb-0", rail ? "md:ml-[68px]" : "")}>
        {children}
      </main>
    </div>
  );
}