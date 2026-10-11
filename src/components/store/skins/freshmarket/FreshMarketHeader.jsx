import { Search, ShoppingBag, User as UserIcon, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/lib/AuthContext";
import { isCustomer } from "@/lib/rinno";
import { modeFor } from "@/lib/templates";

const LOGO_PX = { sm: 36, md: 44, lg: 56 };

// Frutería V2 header — logo is the protagonist and responds to logoPlacement /
// logoSize / headerVariant / typography. Search is always visible (very
// prominent), with account + persistent cart access.
export default function FreshMarketHeader({ business, branding, slug, searchQuery, onSearch }) {
  const { count, businessSlug } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const authIsCustomer = isCustomer(user);
  const sf = branding.storefront;
  const color = branding.shared.primaryColor || "#16A34A";
  const headFont = sf.typography.heading === "display" ? "font-display" : "font-heading";
  const logoPx = LOGO_PX[sf.logoSize] || 44;
  const compact = sf.headerVariant === "compact";
  const placement = sf.logoPlacement;
  const mode = modeFor(business);

  function LogoMark() {
    if (business?.logo) {
      return <img src={business.logo} alt={business?.business_name || "logo"} className="rounded-xl object-contain shrink-0" style={{ width: logoPx, height: logoPx }} />;
    }
    return (
      <div className="rounded-xl flex items-center justify-center text-white font-bold shrink-0" style={{ width: logoPx, height: logoPx, backgroundColor: color, fontSize: Math.round(logoPx * 0.34) }}>
        {(business?.business_name || "RF").slice(0, 2).toUpperCase()}
      </div>
    );
  }

  const actions = (
    <div className="flex items-center gap-1">
      <button aria-label="Mi cuenta" onClick={() => navigate(authIsCustomer ? `/store/${slug}/account` : `/store/${slug}/login`)} className="w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-muted transition-colors">
        <UserIcon className="w-5 h-5" />
      </button>
      <button aria-label="Ver carrito" onClick={() => navigate(`/store/${businessSlug || slug}/cart`)} className="relative w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-muted transition-colors">
        <ShoppingBag className="w-5 h-5" />
        {count > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ backgroundColor: color }}>{count}</span>}
      </button>
    </div>
  );

  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border">
      {placement === "top" && (
        <div className="flex flex-col items-center pt-3 pb-1">
          <LogoMark />
          <p className={`${headFont} font-bold text-foreground mt-1.5 text-base leading-none truncate max-w-[85%]`}>{business?.business_name}</p>
        </div>
      )}
      <div className={`px-4 ${compact ? "py-2" : "py-3"} flex items-center gap-3`}>
        {placement === "header" && <LogoMark />}
        {placement === "header" && (
          <div className="min-w-0 flex-1">
            <p className={`${headFont} font-bold text-sm text-foreground leading-none truncate`}>{business?.business_name}</p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{business?.city || "Entrega en tu zona"}</p>
          </div>
        )}
        {placement === "center" && (
          <>
            <div className="w-16 shrink-0" />
            <div className="flex flex-col items-center min-w-0 flex-1">
              <LogoMark />
              <p className={`${headFont} font-bold text-foreground text-sm leading-none truncate max-w-full mt-1`}>{business?.business_name}</p>
            </div>
            <div className="w-16 shrink-0 flex justify-end">{actions}</div>
          </>
        )}
        {placement === "top" && <div className="flex-1" />}
        {(placement === "header" || placement === "top") && actions}
      </div>
      <div className="px-4 pb-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={searchQuery} onChange={e => onSearch(e.target.value)} placeholder="Buscar frutas, verduras, productos…" className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted text-sm focus:outline-none focus:ring-2" style={{ "--tw-ring-color": color }} />
        </div>
      </div>
      <nav aria-label="Consultas" className="px-4 pb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
        {["COMMERCE", "HYBRID"].includes(mode) && <button onClick={() => navigate(`/store/${slug}/order-lookup`)} className="underline underline-offset-4" style={{ color }}>Seguir pedido</button>}
        {["BOOKING", "HYBRID"].includes(mode) && <button onClick={() => navigate(`/store/${slug}/booking-lookup`)} className="underline underline-offset-4" style={{ color }}>Consultar reserva</button>}
      </nav>
    </header>
  );
}