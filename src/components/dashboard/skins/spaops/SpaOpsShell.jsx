import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SupportBanner, ShellLogo, ShellActions } from "@/components/dashboard/primitives";

const TYPO = { display: "font-display", heading: "font-heading", editorial: "font-editorial" };

// Template Engine V2 — Dashboard · Spa Ops (spaops skin). Agenda-first,
// deliberately different from FreshOps (sidebar), ButcherOps (command bar /
// rail) and BarberOps (underline tabs + dock). Two variants:
//  - workspace (default): a slim, airy vertical icon rail on desktop (icon +
//    label, active = accent left bar); a simple floating rounded bottom bar on
//    mobile (no elevated button — calmer than BarberOps' dock).
//  - bar: a top segmented pill control on all viewports (active = filled
//    accent pill), with a slim brand bar above.
// Same prop contract as the other shells.
export default function SpaOpsShell({ branding, items, user, supportMode, supportBusinessName, onExitSupport, pendingCount, soundEnabled, onToggleSound, onLogout, getRole, children }) {
  const location = useLocation();
  const db = branding.dashboard;
  const accent = (db.tokens && db.tokens.accent) || branding.shared.secondaryColor;
  const headFont = TYPO[db.typography.heading] || "font-heading";
  const logoPx = { sm: 30, md: 36 }[db.logoSize] || 30;
  const minimal = db.headerVariant === "minimal";
  const isBar = db.navigationVariant === "bar";

  const supportBanner = <SupportBanner supportMode={supportMode} supportBusinessName={supportBusinessName} onExitSupport={onExitSupport} />;

  // workspace desktop rail
  const Rail = () => (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[88px] bg-sidebar border-r border-sidebar-border flex-col items-center py-5 gap-1">
      <div className="mb-4"><ShellLogo branding={branding} size={logoPx} radiusClass="" radiusPx={8} fontClass="font-editorial font-bold" fallbackLetter="S" /></div>
      <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2 overflow-y-auto">
        {items.map(it => {
          const active = location.pathname === it.path;
          const Icon = it.icon;
          return (
            <Link key={it.path} to={it.path} className={cn("relative w-full flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-colors", active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-[3px] rounded-full" style={{ backgroundColor: accent }} />}
              <div className="relative"><Icon className="w-5 h-5" style={active ? { color: accent } : {}} />{it.path === "/orders" && pendingCount > 0 && <span className="absolute -top-1.5 -right-2 bg-amber-500 text-white text-[8px] font-bold min-w-[14px] h-[14px] px-0.5 rounded-full flex items-center justify-center">{pendingCount}</span>}</div>
              <span className="text-[10px] leading-none">{it.label}</span>
            </Link>
          );
        })}
      </nav>
      <ShellActions pendingCount={pendingCount} soundEnabled={soundEnabled} onToggleSound={onToggleSound} onLogout={onLogout} big pendingLabel="ped." />
    </aside>
  );

  // workspace mobile floating bar (simple rounded pill, equal items)
  const MobileBar = () => (
    <nav className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-2 py-1.5 rounded-full border border-sidebar-border bg-sidebar/95 backdrop-blur shadow-xl max-w-[94vw] overflow-x-auto" style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom))", scrollbarWidth: "none" }}>
      {items.map(it => {
        const active = location.pathname === it.path;
        const Icon = it.icon;
        return (
          <Link key={it.path} to={it.path} className={cn("flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors shrink-0", active ? "text-white" : "text-muted-foreground")} style={active ? { backgroundColor: accent } : {}}>
            <div className="relative"><Icon className="w-5 h-5" />{it.path === "/orders" && pendingCount > 0 && <span className="absolute -top-1.5 -right-2 bg-amber-500 text-white text-[8px] font-bold min-w-[14px] h-[14px] px-0.5 rounded-full flex items-center justify-center">{pendingCount}</span>}</div>
            <span className="truncate max-w-[48px]">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  // mobile brand bar (workspace variant)
  const MobileTop = () => (
    <header className="md:hidden sticky top-0 z-30 bg-sidebar/90 backdrop-blur border-b border-sidebar-border px-4 py-2.5 flex items-center gap-2.5">
      <ShellLogo branding={branding} size={30} radiusClass="" radiusPx={8} fontClass="font-editorial font-bold" fallbackLetter="S" />
      <div className="min-w-0"><p className={`${headFont} font-semibold text-foreground text-sm leading-none truncate`} style={{ letterSpacing: "-0.01em" }}>{branding.shared.businessName || "Spa"}</p><p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{getRole}</p></div>
      <div className="ml-auto"><ShellActions pendingCount={pendingCount} soundEnabled={soundEnabled} onToggleSound={onToggleSound} onLogout={onLogout} pendingLabel="ped." /></div>
    </header>
  );

  // bar variant top brand + pill control
  const BarTop = () => (
    <header className="sticky top-0 z-30 bg-sidebar/90 backdrop-blur border-b border-sidebar-border">
      <div className={cn("flex items-center gap-2.5 px-4", minimal ? "py-2" : "py-3")}>
        <ShellLogo branding={branding} size={logoPx} radiusClass="" radiusPx={8} fontClass="font-editorial font-bold" fallbackLetter="S" />
        <div className="min-w-0"><p className={`${headFont} font-semibold text-foreground leading-none truncate`} style={{ fontSize: 14, letterSpacing: "-0.01em" }}>{branding.shared.businessName || "Spa"}</p><p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{getRole}</p></div>
        <div className="ml-auto"><ShellActions pendingCount={pendingCount} soundEnabled={soundEnabled} onToggleSound={onToggleSound} onLogout={onLogout} pendingLabel="ped." /></div>
      </div>
      <nav className="flex items-center gap-1.5 px-3 pb-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {items.map(it => {
          const active = location.pathname === it.path;
          const Icon = it.icon;
          return (
            <Link key={it.path} to={it.path} className={cn("inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full text-sm font-medium whitespace-nowrap transition-colors", active ? "text-white" : "text-muted-foreground hover:text-foreground")} style={active ? { backgroundColor: accent } : {}}>
              <Icon className="w-4 h-4" />{it.label}
              {it.path === "/orders" && pendingCount > 0 && <span className="ml-0.5 bg-amber-500 text-white text-[9px] font-bold min-w-[15px] h-[15px] px-1 rounded-full flex items-center justify-center">{pendingCount}</span>}
            </Link>
          );
        })}
      </nav>
    </header>
  );

  if (isBar) {
    return (
      <div className="min-h-screen bg-background">
        {supportBanner}
        <BarTop />
        <main className="min-h-screen pb-24 md:pb-10">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Rail />
      <main className="md:pl-[88px] min-h-screen pb-24 md:pb-10">
        {supportBanner}
        <MobileTop />
        {children}
      </main>
      <MobileBar />
    </div>
  );
}