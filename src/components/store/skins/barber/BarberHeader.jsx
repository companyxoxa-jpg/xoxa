import { useNavigate, Link } from "react-router-dom";
import { Calendar, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { isCustomer } from "@/lib/rinno";

const LOGO_PX = { sm: 34, md: 44, lg: 56 };

// Barbería V2 — editorial header. The brand lockup sits on a slim bar with an
// accent rule; logo uses object-contain. A single "Reservar" CTA lives in the
// header itself (booking-first), plus account + lookup. Responds to
// typography / logoPlacement / logoSize / headerVariant.
export default function BarberHeader({ business, branding, slug, onReserve }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const sf = branding.storefront;
  const color = branding.shared.primaryColor;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const headFont = sf.typography.heading === "editorial" ? "font-editorial" : "font-display";
  const logoPx = LOGO_PX[sf.logoSize] || 44;
  const compact = sf.headerVariant === "compact";
  const placement = sf.logoPlacement;

  function Logo({ size }) {
    const px = size || logoPx;
    if (business?.logo) return <img src={business.logo} alt={business?.business_name || "logo"} className="object-contain shrink-0" style={{ width: px, height: px }} />;
    return <div className="flex items-center justify-center shrink-0 font-editorial font-bold text-white" style={{ width: px, height: px, backgroundColor: color, fontSize: Math.round(px * 0.36) }}>{(business?.business_name || "B").slice(0, 2).toUpperCase()}</div>;
  }
  const Name = ({ center }) => (
    <span className={`${headFont} font-bold text-foreground tracking-tight leading-none ${center ? "text-center" : ""}`} style={{ fontSize: compact ? 16 : 19 }}>{business?.business_name}</span>
  );

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
      <div className="absolute left-0 bottom-0 h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${color}, ${accent})` }} />
      {placement === "top" && (
        <div className="flex flex-col items-center pt-3 pb-1.5"><Logo /><div className="mt-1.5"><Name center /></div></div>
      )}
      <div className={`px-4 ${compact ? "py-2" : "py-3"} flex items-center gap-3 ${placement === "center" ? "justify-center relative" : ""}`}>
        {placement === "header" && <><Logo /><Name /></>}
        {placement === "center" && <div className="flex flex-col items-center min-w-0 flex-1"><Logo /><div className="mt-1"><Name center /></div></div>}
        {(placement === "header" || placement === "top") && (
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => navigate(isCustomer(user) ? `/store/${slug}/account/appointments` : user ? `/store/${slug}/booking-lookup` : `/store/${slug}/login?returnTo=${encodeURIComponent(`/store/${slug}/account/appointments`)}`)} className="w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-muted" aria-label={isCustomer(user) ? "Mis citas" : "Mi cuenta"}><UserIcon className="w-[18px] h-[18px]" /></button>
            <button onClick={onReserve} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-white text-sm font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: color }}>
              <Calendar className="w-4 h-4" />Reservar
            </button>
          </div>
        )}
        {placement === "center" && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <button onClick={() => navigate(isCustomer(user) ? `/store/${slug}/account/appointments` : user ? `/store/${slug}/booking-lookup` : `/store/${slug}/login?returnTo=${encodeURIComponent(`/store/${slug}/account/appointments`)}`)} className="w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-muted" aria-label={isCustomer(user) ? "Mis citas" : "Mi cuenta"}><UserIcon className="w-[18px] h-[18px]" /></button>
            <button onClick={onReserve} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-white text-sm font-semibold" style={{ backgroundColor: color }}><Calendar className="w-4 h-4" />Reservar</button>
          </div>
        )}
      </div>
      {/* Mobile lookup link row */}
      <div className="sm:hidden px-4 pb-2 -mt-1 flex items-center gap-3 text-xs text-muted-foreground">
        <Link to={`/store/${slug}/booking-lookup`} className="underline underline-offset-4" style={{ color: accent }}>Consultar reserva</Link>
      </div>
    </header>
  );
}
