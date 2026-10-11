import { ArrowRight, PackageSearch } from "lucide-react";
import { templateFor } from '@/lib/templates';

// Template Engine V2 — Retail hero. Two variants, both retail-oriented and
// distinct from every other V2 hero:
//  - campaign (default): a full-bleed visual campaign with a left-aligned
//    headline, tagline and two CTAs (Ver catálogo · Seguir pedido). Soft
//    left-to-right scrim so text stays legible over any image.
//  - collection: hero + categories work together — a 60/40 split where the
//    left is the campaign visual and the right is a 2×2 grid of category
//    tiles that double as discovery + filtering.
export default function RetailHero({ business, branding, categories, onShop, onSelectCategory }) {
  const sf = branding.storefront;
  const color = branding.shared.primaryColor;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const headFont = sf.typography.heading === "heading" ? "font-heading" : "font-display";
  const headline = business.headline || business.business_name || "Tu tienda, online.";
  const tagline = business.tagline || "Descubre nuestra colección y compra en pocos clics.";
  const template = templateFor(business);
  const legacyCover = business.cover_image?.includes('photo-1441986300917-64674bd600d8');
  const img = legacyCover ? template.image : (business.cover_image || template.image);

  if (sf.heroVariant === "collection") {
    const tiles = categories.slice(0, 4);
    return (
      <section className="px-4 sm:px-5 pt-4">
        <div className="grid md:grid-cols-5 gap-3 rounded-3xl overflow-hidden">
          <div className="md:col-span-3 relative min-h-[220px] md:min-h-[340px]">
            <img src={img} alt={`Colección destacada de ${business.business_name}`} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.32) 55%, rgba(0,0,0,0.05) 100%)` }} />
            <div className="relative h-full flex flex-col justify-end p-6 sm:p-8 max-w-md">
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/75 mb-2">{business.city || "Tienda"}</p>
              <h1 className={`${headFont} font-semibold text-white text-2xl sm:text-4xl leading-[1.08]`} style={{ letterSpacing: "-0.015em" }}>{headline}</h1>
              <p className="text-white/85 text-sm mt-2.5 leading-relaxed">{tagline}</p>
              <button onClick={onShop} className="mt-5 inline-flex items-center gap-2 self-start px-6 h-11 rounded-full text-white text-sm font-medium transition-transform hover:scale-[1.02]" style={{ backgroundColor: color }}>
                Ver catálogo <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="md:col-span-2 grid grid-cols-2 md:grid-rows-2 gap-3">
            {tiles.length === 0 && Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded-2xl" style={{ background: `linear-gradient(135deg, ${color}22, ${accent}22)` }} />)}
            {tiles.map((c) => (
              <button key={c.id} onClick={() => onSelectCategory(c.id)} className="relative rounded-2xl overflow-hidden text-left group min-h-[88px] md:min-h-0">
                {c.image ? <img src={c.image} alt={c.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${color}44, ${accent}44)` }} />}
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.62) 100%)" }} />
                <span className="absolute bottom-2 left-2.5 text-white text-xs sm:text-sm font-semibold leading-tight">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 sm:px-5 pt-4">
      <div className="relative rounded-3xl overflow-hidden min-h-[240px] sm:min-h-[360px]">
        <img src={img} alt={`Colección destacada de ${business.business_name}`} className="art-hero-image absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, rgba(0,0,0,0.66) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.08) 100%)` }} />
        <div className="relative h-full flex flex-col justify-center p-6 sm:p-10 max-w-xl">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/75 mb-3">Nueva colección</p>
          <h1 className={`${headFont} font-semibold text-white text-3xl sm:text-5xl leading-[1.06]`} style={{ letterSpacing: "-0.02em" }}>{headline}</h1>
          <p className="text-white/85 text-sm sm:text-base mt-3 leading-relaxed max-w-md">{tagline}</p>
          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <button onClick={onShop} className="inline-flex items-center gap-2 px-6 h-11 rounded-full text-white text-sm font-medium transition-transform hover:scale-[1.02]" style={{ backgroundColor: color }}>
              Ver catálogo <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={onShop} className="inline-flex items-center gap-2 px-5 h-11 rounded-full text-white text-sm font-medium border border-white/40 hover:bg-white/10 transition-colors">
              <PackageSearch className="w-4 h-4" /> Descubrir
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}


