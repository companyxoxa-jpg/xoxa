import { useNavigate } from "react-router-dom";
import { Calendar, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { isCustomer } from "@/lib/rinno";

const LOGO_PX = { sm: 34, md: 44, lg: 56 };

// Belleza/Spa V2 — airy, minimalist header. Distinct from Barbería's slim bar +
// gradient rule + filled pill: here a hairline divider, generous whitespace
// and an OUTLINED "Reservar" pill (border + accent text). Logo always
// object-contain. Responds to typography / logoPlacement / logoSize /
// headerVariant.
export default function SpaHeader({ business, branding, slug, onReserve }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const sf = branding.storefront;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const headFont = sf.typography.heading === "editorial" ? "font-editorial" : "font-display";
  const logoPx = LOGO_PX[sf.logoSize] || 44;
  const minimal = sf.headerVariant === "minimal";
  const placement = sf.logoPlacement;

  function Logo({ size }) {
    const px = size || logoPx;
    if (business?.logo) return <img src={business.logo} alt={business?.business_name || "logo"} className="object-contain shrink-0" style={{ width: px, height: px }} />;
    return <div className="flex items-center justify-center shrink-0 font-editorial font-bold text-white" style={{ width: px, height: px, backgroundColor: branding.shared.primaryColor, fontSize: Math.round(px * 0.34), borderRadius: 8 }}>{(business?.business_name || "S").slice(0, 2).toUpperCase()}</div>;
  }
  const Name = ({ center }) => (
    <span className={`${headFont} font-semibold text-foreground tracking-tight leading-none ${center ? "text-center" : ""}`} style={{ fontSize: minimal ? 15 : 18, letterSpacing: "-0.01em" }}>{business?.business_name}</span>
  );
  const Reserve = () => (
    <button onClick={onReserve} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-sm font-medium transition-colors hover:bg-accent/10" style={{ border: `1px solid ${accent}`, color: accent }}>
      <Calendar className="w-4 h-4" />Reservar
    </button>
  );
  const Account = () => (
    <button onClick={() => navigate(isCustomer(user) ? `/store/${slug}/account/appointments` : `/store/${slug}/booking-lookup`)} className="w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-muted" aria-label="Mi cuenta"><UserIcon className="w-[18px] h-[18px]" /></button>
  );

  return (
    <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md">
      {placement === "top" && (
        <div className="flex flex-col items-center pt-4 pb-2"><Logo /><div className="mt-2"><Name center /></div></div>
      )}
      <div className={`relative px-5 ${minimal ? "py-2" : "py-4"} flex items-center gap-3 ${placement === "center" ? "justify-center" : ""}`}>
        {placement === "header" && <><Logo /><Name /></>}
        {placement === "center" && <div className="flex flex-col items-center min-w-0 flex-1"><Logo /><div className="mt-1.5"><Name center /></div></div>}
        {(placement === "header" || placement === "top") && (
          <div className="ml-auto flex items-center gap-2"><Account /><Reserve /></div>
        )}
        {placement === "center" && (
          <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2"><Account /><Reserve /></div>
        )}
      </div>
      <div className="h-px w-full bg-border" />
    </header>
  );
}