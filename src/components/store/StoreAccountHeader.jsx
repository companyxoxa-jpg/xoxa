import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

// Reusable branded header for storefront account pages.
// Shows the business logo/name/colors instead of RINNO admin branding.
export default function StoreAccountHeader({ business, slug, primaryColor, onBack, backLabel, title }) {
  const color = primaryColor || business?.primary_color || "#16A34A";
  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border">
      <div className="px-4 py-3 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="p-1 -ml-1 text-foreground shrink-0">
            <span className="text-2xl leading-none">‹</span>
          </button>
        )}
        {/* Business logo/initials */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: color }}>
          {business?.logo ? (
            <img src={business.logo} alt="" className="w-full h-full rounded-xl object-cover" />
          ) : (
            <span className="font-heading font-bold text-sm">{(business?.business_name || "RF").slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading font-bold text-sm text-foreground leading-none truncate">{title || business?.business_name}</p>
          {business && (
            <Link to={`/store/${slug}`} className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 hover:text-foreground">
              <MapPin className="w-3 h-3" /> Ver tienda
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}