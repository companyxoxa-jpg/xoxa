// Frutería V2 hero — compact by design so it never occupies the whole first
// screen. banner = slim gradient strip with a CTA; feature = a bounded card with
// the business cover image + headline/tagline. No hardcoded copy: text comes
// from the business (headline/tagline) with neutral fallbacks.
export default function FreshMarketHero({ business, settings, branding, onShop }) {
  const sf = branding.storefront;
  const color = branding.shared.primaryColor;
  const secondary = branding.shared.secondaryColor;
  const accent = (sf.tokens && sf.tokens.accent) || secondary;
  const headFont = sf.typography.heading === "display" ? "font-display" : "font-heading";
  const headline = business.headline || business.business_name || "";
  const tagline = business.tagline || settings?.store_description || "";
  const compact = sf.density === "compact";
  const variant = sf.heroVariant;
  const template = templateFor(business);
  const legacyCover = business.cover_image?.includes('photo-1542838132-92c53300491e');
  const hero = legacyCover ? template.image : (business.cover_image || template.image);

  if (variant === "feature" && hero) {
    return (
      <section className="px-4 mt-3">
        <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: compact ? 150 : 190 }}>
          <img src={hero} alt={`Selección fresca de ${business.business_name}`} className="art-hero-image absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${color}cc, ${secondary}55)` }} />
          <div className="relative p-5 flex flex-col justify-end h-full" style={{ minHeight: compact ? 150 : 190 }}>
            {headline && <h1 className={`${headFont} font-bold text-white text-xl leading-tight`}>{headline}</h1>}
            {tagline && <p className="text-white/90 text-sm mt-1 line-clamp-2">{tagline}</p>}
            <button onClick={onShop} className="self-start mt-3 px-5 py-2.5 rounded-xl bg-white text-sm font-semibold transition-opacity hover:opacity-90" style={{ color }}>Ver productos</button>
          </div>
        </div>
      </section>
    );
  }

  // banner (default)
  return (
    <section className="px-4 mt-3">
      <div className="rounded-2xl p-4 flex items-center justify-between gap-3" style={{ background: `linear-gradient(135deg, ${color}, ${secondary})` }}>
        <div className="min-w-0">
          {headline && <h1 className={`${headFont} font-bold text-white text-base leading-tight truncate`}>{headline}</h1>}
          {tagline && <p className="text-white/85 text-xs mt-0.5 line-clamp-1">{tagline}</p>}
        </div>
        <button onClick={onShop} className="shrink-0 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: accent }}>Comprar</button>
      </div>
    </section>
  );
}
import { templateFor } from '@/lib/templates';


