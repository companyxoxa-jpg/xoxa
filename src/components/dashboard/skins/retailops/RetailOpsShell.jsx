import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LogOut, Volume2, VolumeX } from "lucide-react";
import { SupportBanner, ShellLogo } from "@/components/dashboard/primitives";

const TYPO = { display: "font-display", heading: "font-heading" };

// Template Engine V2 — Dashboard · Retail Ops (retailops skin). The fifth
// navigation family — a top HEADER (brand + quick stats + actions) followed
// by a horizontal navigation. Deliberately different from:
//   FreshOps sidebar · ButcherOps command-bar/rail · BarberOps tabs/dock ·
//   SpaOps workspace-rail / pills.
// Two variants:
//   ribbon (default): a sticky horizontal RIBBON of wide rectangular tabs
//     (icon + label inline, active = solid accent tab) — not round pills,
//     not underline tabs, not a sidebar.
//   launcher: the header hosts a row of large MODULE TILES (icon over label,
//     active = accent card) that act as both nav + launcher on every page —
//     a "launcher strip", not a rail and not a pill bar.
export default function RetailOpsShell({ branding, items, user, supportMode, supportBusinessName, onExitSupport, pendingCount, soundEnabled, onToggleSound, onLogout, getRole, children }) {
  const location = useLocation();
  const db = branding.dashboard;
  const accent = (db.tokens && db.tokens.accent) || branding.shared.secondaryColor;
  const headFont = TYPO[db.typography.heading] || "font-heading";
  const logoPx = { sm: 30, md: 36 }[db.logoSize] || 30;
  const compact = db.headerVariant === "compact";
  const isLauncher = db.navigationVariant === "launcher";

  const supportBanner = <SupportBanner supportMode={supportMode} supportBusinessName={supportBusinessName} onExitSupport={onExitSupport} />;

  const actions = (
    <div className="flex items-center gap-1.5">
      {pendingCount > 0 && <Link to="/orders" className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingCount} ped.</Link>}
      {soundEnabled !== undefined && <button onClick={onToggleSound} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent" title={soundEnabled ? "Sonido on" : "Sonido off"}>{soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}</button>}
      <button onClick={onLogout} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent" title="Cerrar sesión"><LogOut className="w-4 h-4" /></button>
    </div>
  );

  // ribbon: wide rectangular tabs, active = solid accent
  const Ribbon = (
    <nav className="border-b border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-1.5 px-3 sm:px-5 py-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {items.map((it) => {
          const active = location.pathname === it.path;
          const Icon = it.icon;
          return (
            <Link key={it.path} to={it.path} className={cn("inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium whitespace-nowrap transition-colors", active ? "text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent")} style={active ? { backgroundColor: accent } : {}}>
              <Icon className="w-4 h-4" />
              {it.label}
              {it.path === "/orders" && pendingCount > 0 && <span className="ml-0.5 bg-amber-500 text-white text-[9px] font-bold min-w-[15px] h-[15px] px-1 rounded-full flex items-center justify-center">{pendingCount}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );

  // launcher: large module tiles in a row, active = accent card
  const Launcher = (
    <nav className="border-b border-sidebar-border bg-sidebar">
      <div className="flex items-stretch gap-2 px-3 sm:px-5 py-2.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {items.map((it) => {
          const active = location.pathname === it.path;
          const Icon = it.icon;
          return (
            <Link key={it.path} to={it.path} className={cn("relative flex flex-col items-center justify-center gap-1 px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors min-w-[76px]", active ? "text-white" : "text-muted-foreground hover:text-foreground bg-sidebar-accent/50")} style={active ? { backgroundColor: accent } : {}}>
              <div className="relative"><Icon className="w-5 h-5" />{it.path === "/orders" && pendingCount > 0 && <span className="absolute -top-1.5 -right-2 bg-amber-500 text-white text-[8px] font-bold min-w-[14px] h-[14px] px-0.5 rounded-full flex items-center justify-center">{pendingCount}</span>}</div>
              <span className="text-[11px] font-medium leading-none">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {supportBanner}
      <div className="sticky top-0 z-30 bg-sidebar/95 backdrop-blur">
        <header className="border-b border-sidebar-border/60">
          <div className={cn("flex items-center gap-3 px-4 sm:px-6", compact ? "py-2.5" : "py-3.5")}>
            <ShellLogo branding={branding} size={logoPx} radiusClass="" radiusPx={8} fontClass="font-display font-bold" fallbackLetter="R" solid />
            <div className="min-w-0">
              <p className={`${headFont} font-semibold text-foreground leading-none truncate`} style={{ fontSize: compact ? 14 : 16, letterSpacing: "-0.01em" }}>{branding.shared.businessName || "Tienda"}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{getRole}</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {pendingCount > 0 && !compact && <div className="hidden sm:flex items-center gap-1.5 text-xs"><span className="text-muted-foreground">Pendientes</span><span className="font-semibold text-amber-500">{pendingCount}</span></div>}
              {actions}
            </div>
          </div>
        </header>
        {isLauncher ? Launcher : Ribbon}
      </div>
      <main className="min-h-screen pb-24 md:pb-10">{children}</main>
    </div>
  );
}