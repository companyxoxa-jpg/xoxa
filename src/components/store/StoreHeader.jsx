import { Search, ShoppingBag, MapPin, User as UserIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/lib/AuthContext";
import { isCustomer } from "@/lib/rinno";
import { modeFor } from "../../../base44/shared/templates.js";

export default function StoreHeader({ business, slug, onToggleSearch, primaryColor }) {
  const { count, businessSlug } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const authIsCustomer = isCustomer(user);
  const color = primaryColor || "#16A34A";
  const mode = modeFor(business);

  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Business logo — single source of truth: Business.logo */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 overflow-hidden" style={{ backgroundColor: color }}>
            {business?.logo ? (
              <img src={business.logo} alt={business?.business_name || "logo"} className="w-full h-full object-cover" />
            ) : (
              <span className="font-heading font-bold text-sm">{(business?.business_name || "RF").slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-heading font-bold text-sm text-foreground leading-none truncate">{business?.business_name}</p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />
              Entrega en tu zona
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button aria-label="Mi cuenta" onClick={() => navigate(authIsCustomer ? `/store/${slug}/account` : `/store/${slug}/login`)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-muted transition-colors">
            <UserIcon className="w-5 h-5" />
          </button>
          <button aria-label="Buscar productos" onClick={onToggleSearch}
            className="w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-muted transition-colors">
            <Search className="w-5 h-5" />
          </button>
          <button aria-label="Ver carrito" onClick={() => navigate(`/store/${businessSlug || slug}/cart`)}
            className="relative w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-muted transition-colors">
            <ShoppingBag className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ backgroundColor: color }}>
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
      <nav aria-label="Consultas" className="px-4 pb-2 flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs font-medium">
        {['COMMERCE', 'HYBRID'].includes(mode) && <button onClick={() => navigate(`/store/${slug}/order-lookup`)} className="underline underline-offset-4" style={{ color }}>Seguir pedido</button>}
        {['BOOKING', 'HYBRID'].includes(mode) && <button onClick={() => navigate(`/store/${slug}/booking-lookup`)} className="underline underline-offset-4" style={{ color }}>Consultar reserva</button>}
      </nav>
    </header>
  );
}

