import { Calendar } from "lucide-react";
import { templateFor } from '@/lib/templates';

// Belleza/Spa V2 — photographic hero. Two variants, distinct from Barbería
// (editorial split / feature):
//  - immersive (default): full-bleed photograph, tall, soft light-to-dark
//    scrim, optional logo over the image, centered copy at the bottom.
//  - split: portrait photo on the left + an airy whitespace text panel on the
//    right (light, not colored) with generous padding. No vertical rule.
// heroOverlay token (0-100) controls the scrim darkness.
export default function SpaHero({ business, branding, onReserve }) {
  const sf = branding.storefront;
  const color = branding.shared.primaryColor;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const headFont = sf.typography.heading === "editorial" ? "font-editorial" : "font-display";
  const overlay = (sf.tokens && sf.tokens.heroOverlay) ?? 30;
  const headline = business.headline || business.business_name || "";
  const tagline = business.tagline || "Rituales de cuidado y bienestar.";
  const template = templateFor(business);
  const legacyCover = business.cover_image?.includes('photo-1540555700478-4be289fbecef');
  const img = legacyCover ? template.image : (business.cover_image || template.image);
  const showLogoOver = (sf.logoPlacement === "top" || sf.logoPlacement === "center") && business.logo;

  if (sf.heroVariant === "split") {
    return (
      <section className="relative">
        <div className="grid md:grid-cols-2 min-h-[58vh]">
          <div className="relative min-h-[260px] md:min-h-0 overflow-hidden order-1">
            <img src={img} alt={`Experiencia de bienestar en ${business.business_name}`} className="art-hero-image absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="relative flex items-center order-2 px-6 sm:px-12 py-12">
            <div className="md:pl-8 max-w-md">
              <p className="text-[11px] uppercase tracking-[0.3em] mb-4" style={{ color: accent }}>Belleza · Spa</p>
              <h1 className={`${headFont} font-semibold text-foreground text-3xl sm:text-5xl leading-[1.1]`} style={{ letterSpacing: "-0.015em" }}>{headline}</h1>
              <p className="text-muted-foreground text-sm sm:text-base mt-4 leading-relaxed">{tagline}</p>
              <button onClick={onReserve} className="mt-7 inline-flex items-center gap-2 px-7 h-11 rounded-full text-white text-sm font-medium transition-transform hover:scale-[1.02]" style={{ backgroundColor: color }}>
                <Calendar className="w-4 h-4" />Reservar tratamiento
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative">
      <div className="relative h-[68vh] min-h-[380px] w-full overflow-hidden">
        <img src={img} alt={`Experiencia de bienestar en ${business.business_name}`} className="art-hero-image absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(0,0,0,${Math.max(overlay - 12, 0) / 100}) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 55%, rgba(0,0,0,${overlay / 100}) 100%)` }} />
        {showLogoOver && (
          <div className="absolute top-7 left-1/2 -translate-x-1/2"><img src={business.logo} alt={business.business_name} className="object-contain" style={{ height: 56, width: 56 }} /></div>
        )}
        <div className="relative h-full flex flex-col items-center justify-end text-center px-6 pb-12">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/75 mb-3">Belleza · {business.city || "Spa"}</p>
          <h1 className={`${headFont} font-semibold text-white text-3xl sm:text-5xl leading-[1.1] max-w-2xl`} style={{ letterSpacing: "-0.015em" }}>{headline}</h1>
          <p className="text-white/85 text-sm sm:text-base mt-4 max-w-md leading-relaxed">{tagline}</p>
          <button onClick={onReserve} className="mt-7 inline-flex items-center gap-2 px-7 h-11 rounded-full text-white text-sm font-medium transition-transform hover:scale-[1.02]" style={{ backgroundColor: color, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
            <Calendar className="w-4 h-4" />Reservar tratamiento
          </button>
        </div>
      </div>
    </section>
  );
}


