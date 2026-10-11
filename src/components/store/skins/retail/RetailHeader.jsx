import { useNavigate } from "react-router-dom";
import { Search, ShoppingBag, User as UserIcon, MapPin } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/lib/AuthContext";
import { isCustomer } from "@/lib/rinno";
import { modeFor } from "@/lib/templates";

const LOGO_PX = { sm: 36, md: 44, lg: 52 };

// Template Engine V2 — Retail header. Three tiers, deliberately different
// from Frutería (single brand row + separate CategoryBar) and Carnicería
// (centered masthead): a slim UTILITY BAR (city + follow order) → a BRAND ROW
// (logo prominent, desktop search inline, account + cart) → a CATEGORY NAV
// ROW (horizontal pills, sticky, the storefront's category navigation).
export default function RetailHeader({ business, branding, slug, categories, activeCategory, onSelectCategory, searchQuery, onSearchChange, searchOpen, onToggleSearch }) {
  const { count, businessSlug } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const authIsCustomer = isCustomer(user);
  const sf = branding.storefront;
  const color = branding.shared.primaryColor;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const headFont = sf.typography.heading === "heading" ? "font-heading" : "font-display";
  const logoPx = LOGO_PX[sf.logoSize] || 44;
  const compact = sf.headerVariant === "compact";
  const placement = sf.logoPlacement;
  const mode = modeFor(business);

  function Logo({ size }) {
    const px = size || logoPx;
    if (business?.logo) return <img src={business.logo} alt={business?.business_name || "logo"} className="object-contain shrink-0" style={{ width: px, height: px }} />;
    return <div className="flex items-center justify-center shrink-0 font-display font-bold text-white rounded-xl" style={{ width: px, height: px, backgroundColor: color, fontSize: Math.round(px * 0.34) }}>{(business?.business_name || "R").slice(0, 2).toUpperCase()}</div>;
  }
  const Name = () => <span className={`${headFont} font-semibold text-foreground leading-none truncate`} style={{ fontSize: compact ? 15 : 17, letterSpacing: "-0.01em" }}>{business?.business_name}</span>;
  const Account = () => <button aria-label="Mi cuenta" onClick={() => navigate(authIsCustomer ? `/store/${slug}/account` : `/store/${slug}/login`)} className="w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-muted transition-colors"><UserIcon className="w-5 h-5" /></button>;
  const SearchBtn = () => <button aria-label="Buscar" onClick={onToggleSearch} className="w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-muted transition-colors"><Search className="w-5 h-5" /></button>;
  const Cart = () => <button aria-label="Ver carrito" onClick={() => navigate(`/store/${businessSlug || slug}/cart`)} className="relative w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-muted transition-colors"><ShoppingBag className="w-5 h-5" />{count > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ backgroundColor: color }}>{count}</span>}</button>;

  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border">
      {/* Utility bar */}
      <div className="hidden sm:flex items-center justify-between px-5 py-1.5 text-[11px] text-muted-foreground border-b border-border/60">
        <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" style={{ color: accent }} />{business?.city || "Tu tienda de confianza"}</span>
        {["COMMERCE", "HYBRID"].includes(mode) && <button onClick={() => navigate(`/store/${slug}/order-lookup`)} className="hover:text-foreground transition-colors">Seguir pedido</button>}
      </div>

      {/* Centered logo strip (logoPlacement 'top') */}
      {placement === "top" && (
        <div className="flex justify-center pt-3 pb-1"><Logo /></div>
      )}

      {/* Brand row */}
      <div className={`px-4 sm:px-5 ${compact ? "py-2" : "py-3"} flex items-center gap-3`}>
        {placement === "header" && <div className="flex items-center gap-2.5 min-w-0"><Logo /><Name /></div>}
        {placement === "top" && <div className="min-w-0"><Name /></div>}
        {/* Desktop inline search */}
        <div className="hidden md:flex flex-1 max-w-md mx-auto">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="Buscar productos…" className="w-full pl-10 pr-4 h-10 rounded-full bg-muted text-sm focus:outline-none focus:ring-1 border border-transparent" style={{ "--tw-ring-color": accent }} />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="md:hidden"><SearchBtn /></div>
          <Account />
          <Cart />
        </div>
      </div>

      {/* Mobile search row */}
      {searchOpen && (
        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input autoFocus value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="Buscar productos…" className="w-full pl-10 pr-4 h-10 rounded-full bg-muted text-sm focus:outline-none focus:ring-1 border border-transparent" style={{ "--tw-ring-color": accent }} />
          </div>
        </div>
      )}

      {/* Category nav row — the storefront category navigation */}
      <nav className="flex items-center gap-1.5 px-4 sm:px-5 pb-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <CatPill active={!activeCategory} label="Todo" onClick={() => onSelectCategory(null)} accent={accent} />
        {categories.map((c) => <CatPill key={c.id} active={activeCategory === c.id} label={c.name} onClick={() => onSelectCategory(c.id)} accent={accent} />)}
      </nav>
    </header>
  );
}

function CatPill({ active, label, onClick, accent }) {
  return (
    <button onClick={onClick} className="whitespace-nowrap text-sm font-medium px-3.5 h-8 rounded-full transition-colors shrink-0" style={active ? { backgroundColor: accent, color: "#fff" } : { color: "hsl(var(--muted-foreground))", backgroundColor: "hsl(var(--muted))" }}>{label}</button>
  );
}