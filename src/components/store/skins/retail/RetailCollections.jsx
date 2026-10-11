// Template Engine V2 — Retail collections. Desktop-only editorial category
// tiles for discovery (mobile uses the header's category nav pills, which
// stay compact and never occupy half the screen). Clicking a tile filters
// the catalog. Hidden when searching or when a category is already active
// from the header (the catalog heading then reflects the filter).
export default function RetailCollections({ categories, onSelect, branding }) {
  const sf = branding.storefront;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const headFont = sf.typography.heading === "heading" ? "font-heading" : "font-display";
  if (!categories?.length || categories.length < 2) return null;
  return (
    <section className="hidden md:block px-5 mt-8">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className={`${headFont} font-semibold text-foreground text-xl`} style={{ letterSpacing: "-0.015em" }}>Colecciones</h2>
          <p className="text-xs text-muted-foreground mt-1">Explora por categoría</p>
        </div>
      </div>
      <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
        {categories.map((c) => (
          <button key={c.id} onClick={() => onSelect(c.id)} className="relative rounded-2xl overflow-hidden text-left group" style={{ aspectRatio: "4 / 3" }}>
            {c.image ? <img src={c.image} alt={c.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${branding.shared.primaryColor}33, ${accent}33)` }} />}
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.62) 100%)" }} />
            <span className="absolute bottom-3 left-3 text-white font-semibold text-base leading-tight">{c.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}