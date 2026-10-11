import { Search, ShoppingBag, User as UserIcon, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/lib/AuthContext";
import { isCustomer } from "@/lib/rinno";
import { modeFor } from "@/lib/templates";

const LOGO_PX = { sm: 38, md: 48, lg: 60 };

// Carnicería V2 — masthead. The logo gets a strong presence via a vertical lockup
// (logo + stacked brand name / sector tagline), NOT placed like Frutería. Below
// sits a horizontal utility nav (order/booking lookup) + an inline compact
// search (desktop) / a slim search row (mobile). Responds to logoPlacement /
// logoSize / headerVariant / typography.
export default function ButcherMasthead({ business, branding, slug, searchQuery, onSearch }) {
  const { count, businessSlug } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const authIsCustomer = isCustomer(user);
  const sf = branding.storefront;
  const color = branding.shared.primaryColor || "#842D32";
  const headFont = sf.typography.heading === "display" ? "font-display" : "font-heading";
  const logoPx = LOGO_PX[sf.logoSize] || 48;
  const compact = sf.headerVariant === "compact";
  const placement = sf.logoPlacement;
  const mode = modeFor(business);

  function LogoMark() {
    if (business?.logo) {
      return <img src={business.logo} alt={business?.business_name || "logo"} className="rounded-md object-contain shrink-0" style={{ width: logoPx, height: logoPx }} />;
    }
    return (
      <div className="rounded-md flex items-center justify-center text-white font-bold shrink-0" style={{ width: logoPx, height: logoPx, backgroundColor: color, fontSize: Math.round(logoPx * 0.34) }}>
        {(business?.business_name || "CA").slice(0, 2).toUpperCase()}
      </div>
    );
  }

  const NameLockup = ({ center = false }) => (
    <div className={`min-w-0 ${center ? "text-center" : ""}`}>
      <p className={`${headFont} font-bold text-foreground leading-none truncate`} style={{ fontSize: compact ? 15 : 18 }}>{business?.business_name}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em] mt-1">{business?.city || "Carnicería · Charcutería"}</p>
    </div>
  );

  const actions = (
    <div className="flex items-center gap-1.5">
      <button aria-label="Mi cuenta" onClick={() => navigate(authIsCustomer ? `/store/${slug}/account` : `/store/${slug}/login`)} className="w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-muted transition-colors">
        <UserIcon className="w-5 h-5" />
      </button>
      <button aria-label="Ver carrito" onClick={() => navigate(`/store/${businessSlug || slug}/cart`)} className="relative w-9 h-9 rounded-full flex items-center justify-center text-white transition-opacity hover:opacity-90" style={{ backgroundColor: color }}>
        <ShoppingBag className="w-5 h-5" />
        {count > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-background">{count}</span>}
      </button>
    </div>
  );

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b-2 border-border">
      {/* Masthead row */}
      {placement === "top" && (
        <div className="flex flex-col items-center pt-3 pb-1">
          <LogoMark />
          <div className="mt-2"><NameLockup center /></div>
        </div>
      )}
      <div className={`px-4 ${compact ? "py-2" : "py-3.5"} flex items-center gap-3 ${placement === "center" ? "justify-center" : ""}`}>
        {placement === "header" && <LogoMark />}
        {placement === "header" && <NameLockup />}
        {placement === "center" && (
          <>
            <div className="w-20 shrink-0" />
            <div className="flex flex-col items-center min-w-0 flex-1"><LogoMark /><div className="mt-1.5"><NameLockup center /></div></div>
            <div className="w-20 shrink-0 flex justify-end">{actions}</div>
          </>
        )}
        {placement === "top" && <div className="flex-1" />}
        {(placement === "header" || placement === "top") && <div className="ml-auto flex items-center gap-3">{actions}</div>}
      </div>

      {/* Inline search (desktop) */}
      <div className="hidden sm:block px-4 pb-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={searchQuery} onChange={e => onSearch(e.target.value)} placeholder="Buscar cortes, piezas, preparados…" className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted text-sm focus:outline-none focus:ring-2" style={{ "--tw-ring-color": color }} />
        </div>
      </div>

      {/* Compact search (mobile) */}
      <div className="sm:hidden px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={searchQuery} onChange={e => onSearch(e.target.value)} placeholder="Buscar en el mostrador…" className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted text-sm focus:outline-none focus:ring-2" style={{ "--tw-ring-color": color }} />
        </div>
      </div>

      {/* Horizontal utility nav */}
      <nav aria-label="Consultas" className="px-4 py-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-medium border-t border-border">
        <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3.5 h-3.5" />{business?.city || "Tu zona"}</span>
        {["COMMERCE", "HYBRID"].includes(mode) && <button onClick={() => navigate(`/store/${slug}/order-lookup`)} className="underline underline-offset-4" style={{ color }}>Seguir pedido</button>}
        {["BOOKING", "HYBRID"].includes(mode) && <button onClick={() => navigate(`/store/${slug}/booking-lookup`)} className="underline underline-offset-4" style={{ color }}>Consultar reserva</button>}
      </nav>
    </header>
  );
}