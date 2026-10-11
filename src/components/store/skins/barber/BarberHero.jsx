import { Calendar } from "lucide-react";
import { templateFor } from '@/lib/templates';

// Barbería V2 — photographic hero. Two variants:
//  - editorial (default): split layout, full-bleed photo with an overlay text
//    panel on one side. Photography leads, brand is the experience.
//  - feature: full-bleed photo with a darkened overlay and centered copy.
// The hero occupies more space than Frutería/Carnicería heroes (brand matters).
// heroOverlay token (0-100) controls the overlay darkness.
export default function BarberHero({ business, branding, onReserve }) {
  const sf = branding.storefront;
  const color = branding.shared.primaryColor;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const headFont = sf.typography.heading === "editorial" ? "font-editorial" : "font-display";
  const overlay = (sf.tokens && sf.tokens.heroOverlay) || 35;
  const headline = business.headline || business.business_name || "";
  const tagline = business.tagline || "Cortes precisos y oficio sin prisas.";
  const template = templateFor(business);
  const legacyCover = business.cover_image?.includes('photo-1503951914875-452162b0f3f1');
  const img = legacyCover ? template.image : (business.cover_image || template.image);

  if (sf.heroVariant === "feature") {
    return (
      <section className="relative">
        <div className="relative h-[58vh] min-h-[340px] w-full overflow-hidden">
          <img src={img} alt={`Interior y servicio de ${business.business_name}`} className="art-hero-image absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(0,0,0,${overlay / 100}) 0%, rgba(0,0,0,${(overlay + 20) / 100}) 100%)` }} />
          <div className="relative h-full flex flex-col items-center justify-end text-center px-6 pb-10">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/70 mb-2">Barbería</p>
            <h1 className={`${headFont} font-bold text-white text-3xl sm:text-5xl leading-[1.05] max-w-2xl`}>{headline}</h1>
            <p className="text-white/80 text-sm sm:text-base mt-3 max-w-md">{tagline}</p>
            <button onClick={onReserve} className="mt-5 inline-flex items-center gap-2 px-7 h-11 rounded-full text-white text-sm font-semibold transition-transform hover:scale-[1.02]" style={{ backgroundColor: accent }}>
              <Calendar className="w-4 h-4" />Reservar cita
            </button>
          </div>
        </div>
      </section>
    );
  }

  // editorial split
  return (
    <section className="relative">
      <div className="grid sm:grid-cols-2 min-h-[42vh] sm:min-h-[52vh]">
        <div className="relative order-2 sm:order-1 flex items-center px-6 sm:px-10 py-10" style={{ backgroundColor: color }}>
          <div className="max-w-md">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/65 mb-3">Barbería · {business.city || "Tu barrio"}</p>
            <h1 className={`${headFont} font-bold text-white text-3xl sm:text-5xl leading-[1.05]`}>{headline}</h1>
            <p className="text-white/85 text-sm sm:text-base mt-4 max-w-sm">{tagline}</p>
            <button onClick={onReserve} className="mt-6 inline-flex items-center gap-2 px-7 h-11 rounded-full bg-white text-[13px] font-semibold transition-transform hover:scale-[1.02]" style={{ color }}>
              <Calendar className="w-4 h-4" />Reservar cita
            </button>
          </div>
        </div>
        <div className="relative order-1 sm:order-2 min-h-[220px] overflow-hidden">
          <img src={img} alt={`Interior y servicio de ${business.business_name}`} className="art-hero-image absolute inset-0 w-full h-full object-cover" />
        </div>
      </div>
    </section>
  );
}


