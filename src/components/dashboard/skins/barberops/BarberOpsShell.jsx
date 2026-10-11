import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";
import { SupportBanner, ShellLogo, ShellActions } from "@/components/dashboard/primitives";

const TYPO = { display: "font-display", heading: "font-heading", editorial: "font-editorial" };

// Template Engine V2 — Dashboard · Barbería Ops (barberops skin).
// Agenda-first navigation, deliberately different from FreshOps (sidebar) and
// ButcherOps (command bar / rail). Two variants:
//  - editorial (default): slim brand bar + horizontal underline tabs (desktop);
//    a floating bottom dock with an elevated Agenda button (mobile).
//  - dock: a floating bottom dock on ALL viewports (no top tab row), with a
//    minimal brand bar. Agenda stays one tap away everywhere.
// Same prop contract as the other shells — AppLayout swaps it in without
// touching permissions, alerts, or data.
export default function BarberOpsShell({ branding, items, user, supportMode, supportBusinessName, onExitSupport, pendingCount, soundEnabled, onToggleSound, onLogout, getRole, children }) {
  const location = useLocation();
  const db = branding.dashboard;
  const color = branding.shared.primaryColor;
  const accent = (db.tokens && db.tokens.accent) || branding.shared.secondaryColor;
  const headFont = TYPO[db.typography.heading] || "font-heading";
  const logoPx = { sm: 30, md: 36 }[db.logoSize] || 30;
  const compact = db.headerVariant === "compact";
  const navVariant = db.navigationVariant;
  const isDock = navVariant === "dock";
  const agendaItem = items.find(i => i.path === "/agenda") || { path: "/agenda", icon: Calendar, label: "Agenda" };

  const supportBanner = <SupportBanner supportMode={supportMode} supportBusinessName={supportBusinessName} onExitSupport={onExitSupport} />;

  // Brand bar (always present; slim)
  const BrandBar = () => (
    <header className="sticky top-0 z-30 bg-sidebar border-b border-sidebar-border">
      <div className="absolute left-0 bottom-0 h-[2px] w-full" style={{ background: `linear-gradient(90deg, ${color}, ${accent})` }} />
      <div className={cn("flex items-center gap-2.5 px-4", compact ? "py-2" : "py-3")}>
        <ShellLogo branding={branding} size={logoPx} radiusClass="rounded-md" fontClass="font-editorial font-bold" fallbackLetter="B" />
        <div className="min-w-0">
          <p className={`${headFont} font-bold text-foreground leading-none truncate`} style={{ fontSize: 14 }}>{branding.shared.businessName || "Barbería"}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{getRole}</p>
        </div>
        <div className="ml-auto"><ShellActions pendingCount={pendingCount} soundEnabled={soundEnabled} onToggleSound={onToggleSound} onLogout={onLogout} pendingLabel="ped." /></div>
      </div>
    </header>
  );

  // Desktop editorial underline tabs
  const EditorialTabs = () => (
    <nav className="hidden md:flex items-center gap-1 px-4 border-b border-sidebar-border bg-sidebar overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      {items.map(it => {
        const active = location.pathname === it.path;
        const Icon = it.icon;
        return (
          <Link key={it.path} to={it.path} className={cn("relative flex items-center gap-2 py-3 px-3 text-sm font-medium whitespace-nowrap transition-colors", active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <Icon className="w-4 h-4" />
            {it.label}
            {it.path === "/orders" && pendingCount > 0 && <span className="ml-1 bg-amber-500 text-white text-[9px] font-bold min-w-[15px] h-[15px] px-1 rounded-full flex items-center justify-center">{pendingCount}</span>}
            {active && <span className="absolute left-3 right-3 bottom-0 h-[2px] rounded-full" style={{ backgroundColor: accent }} />}
          </Link>
        );
      })}
    </nav>
  );

  // Floating bottom dock (mobile for editorial, all viewports for dock variant)
  const Dock = () => {
    const others = items;
    const center = agendaItem;
    const left = others.slice(0, Math.ceil(others.length / 2));
    const right = others.slice(Math.ceil(others.length / 2));
    // Reorder: left / Agenda(elevated) / right, excluding agenda from left/right
    const leftNoAgenda = left.filter(i => i.path !== center.path);
    const rightNoAgenda = right.filter(i => i.path !== center.path);
    const DockItem = ({ item }) => {
      const active = location.pathname === item.path;
      const Icon = item.icon;
      return (
        <Link to={item.path} className={cn("flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors", active ? "text-white" : "text-muted-foreground")} style={active ? { color: accent } : {}}>
          <div className="relative"><Icon className="w-5 h-5" />{item.path === "/orders" && pendingCount > 0 && <span className="absolute -top-1.5 -right-2 bg-amber-500 text-white text-[8px] font-bold min-w-[14px] h-[14px] px-0.5 rounded-full flex items-center justify-center">{pendingCount}</span>}</div>
          <span className="truncate max-w-[52px]">{item.label}</span>
        </Link>
      );
    };
    return (
      <nav style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }} className={cn("fixed bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-end gap-1 px-2 py-2 rounded-2xl border border-sidebar-border bg-sidebar/95 backdrop-blur shadow-xl", isDock ? "md:flex" : "md:hidden")}>
        {leftNoAgenda.map(it => <DockItem key={it.path} item={it} />)}
        <Link to={center.path} className={cn("flex flex-col items-center gap-0.5 -mt-5 px-3 pt-1.5 pb-1 rounded-2xl text-[10px] font-semibold text-white shadow-lg", location.pathname === center.path && "ring-2 ring-offset-2 ring-offset-sidebar")} style={{ backgroundColor: accent }}>
          <span className="w-9 h-9 rounded-full flex items-center justify-center bg-white/15 mb-0.5"><center.icon className="w-5 h-5" /></span>
          <span>{center.label}</span>
        </Link>
        {rightNoAgenda.map(it => <DockItem key={it.path} item={it} />)}
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {supportBanner}
      <BrandBar />
      {!isDock && <EditorialTabs />}
      <main className={cn("min-h-screen pb-24 md:pb-10")}>
        {children}
      </main>
      <Dock />
    </div>
  );
}