// Carnicería V2 hero — editorial by default (split text/visual band), or
// "plaque" (a centered bordered card). Never a full-screen hero. Text comes
// from the business (headline/tagline) with neutral fallbacks.
export default function ButcherHero({ business, settings, branding, onShop }) {
  const sf = branding.storefront;
  const color = branding.shared.primaryColor;
  const secondary = branding.shared.secondaryColor;
  const accent = (sf.tokens && sf.tokens.accent) || secondary;
  const headFont = sf.typography.heading === "display" ? "font-display" : "font-heading";
  const headline = business.headline || business.business_name || "";
  const tagline = business.tagline || settings?.store_description || "";
  const variant = sf.heroVariant;
  const template = templateFor(business);
  const legacyCover = business.cover_image?.includes('photo-1607623814075-e51df1bdc82f');
  const hero = legacyCover ? template.image : (business.cover_image || template.image);

  if (variant === "plaque") {
    return (
      <section className="px-4 mt-4">
        <div className="rounded-xl border-2 border-border bg-card px-5 py-5 text-center">
          {headline && <h1 className={`${headFont} font-bold text-foreground text-lg leading-tight`}>{headline}</h1>}
          {tagline && <p className="text-muted-foreground text-sm mt-1.5 max-w-md mx-auto">{tagline}</p>}
          <button onClick={onShop} className="mt-3 inline-flex items-center gap-1.5 px-5 py-2 rounded-md text-white text-sm font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: accent }}>Ver el mostrador →</button>
        </div>
      </section>
    );
  }

  // editorial (default) — split band
  return (
    <section className="px-4 mt-4">
        <div className="butcher-hero-frame rounded-xl overflow-hidden flex flex-col sm:flex-row" style={{ minHeight: 240 }}>
        <div className="p-5 flex flex-col justify-center sm:w-[56%]" style={{ background: `linear-gradient(135deg, ${color}, ${secondary})` }}>
          {headline && <h1 className={`${headFont} font-bold text-white text-lg leading-tight`}>{headline}</h1>}
          {tagline && <p className="text-white/85 text-sm mt-1 line-clamp-2">{tagline}</p>}
          <button onClick={onShop} className="self-start mt-3 px-5 py-2 rounded-md text-white text-sm font-semibold border border-white/40 transition-colors hover:bg-white/10">Ver el mostrador →</button>
        </div>
        <div className="sm:w-[44%] min-h-[180px] sm:min-h-0 relative" style={{ background: hero ? undefined : `linear-gradient(135deg, ${color}22, ${secondary}22)` }}>
          {hero && <img src={hero} alt={`Selección del mostrador de ${business.business_name}`} className="art-hero-image absolute inset-0 w-full h-full object-cover" />}
        </div>
      </div>
    </section>
  );
}
import { templateFor } from '@/lib/templates';


