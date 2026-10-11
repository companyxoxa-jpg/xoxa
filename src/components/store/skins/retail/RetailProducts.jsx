import RetailProductCard from "./RetailProductCard";

// Template Engine V2 — Retail products section. A featured strip (real
// is_featured field) followed by the full catalog grid. Reuses
// RetailProductCard. No invented discounts/variants/stock.
export default function RetailProducts({ products, categories, activeCategory, onAdd, onClick, branding }) {
  const sf = branding.storefront;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const headFont = sf.typography.heading === "heading" ? "font-heading" : "font-display";
  const cols = sf.density === "compact" ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
  const gap = sf.density === "compact" ? "gap-2.5" : "gap-3.5";
  const catName = (id) => categories.find((c) => c.id === id)?.name;

  const featured = products.filter((p) => p.is_featured && p.is_available).slice(0, 4);
  const featuredIds = new Set(featured.map((p) => p.id));
  const rest = products.filter((p) => !featuredIds.has(p.id));
  const list = activeCategory ? products.filter((p) => p.category_id === activeCategory) : (rest.length ? rest : products);

  return (
    <section className="px-4 sm:px-5 mt-8">
      {!activeCategory && featured.length > 0 && (
        <div className="mb-7">
          <div className="flex items-center justify-between mb-3">
            <h2 className={`${headFont} font-semibold text-foreground text-lg`} style={{ letterSpacing: "-0.01em" }}>Destacados</h2>
            <span className="text-xs font-medium" style={{ color: accent }}>Lo mejor de la tienda</span>
          </div>
          <div className={`grid ${cols} ${gap}`}>
            {featured.map((p) => <RetailProductCard key={p.id} product={p} category={undefined} onAdd={onAdd} onClick={onClick} branding={branding} />)}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className={`${headFont} font-semibold text-foreground text-lg`} style={{ letterSpacing: "-0.01em" }}>
          {activeCategory ? catName(activeCategory) : featured.length < products.length ? "Sigue descubriendo" : "Todo el catálogo"}
        </h2>
        <span className="text-xs text-muted-foreground">{list.length} producto{list.length !== 1 ? "s" : ""}</span>
      </div>

      {list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium text-foreground">No hay productos aquí</p>
          <p className="text-xs text-muted-foreground mt-1">Prueba otra categoría o vuelva más tarde.</p>
        </div>
      ) : (
        <div className={`grid ${cols} ${gap}`}>
          {list.map((p) => <RetailProductCard key={p.id} product={p} category={activeCategory ? undefined : categories.find((c) => c.id === p.category_id)} onAdd={onAdd} onClick={onClick} branding={branding} />)}
        </div>
      )}
    </section>
  );
}
