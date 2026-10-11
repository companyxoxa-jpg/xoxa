import { Link } from "react-router-dom";
import ProductCard from "@/components/store/ProductCard";
import { useStorefrontState } from "@/hooks/useStorefrontState";
import CategoryBar from "@/components/store/CategoryBar";
import CartBar from "@/components/store/CartBar";
import CartToast from "@/components/store/CartToast";
import ProductDetailSheet from "@/components/store/ProductDetailSheet";
import FreshMarketHeader from "./FreshMarketHeader";
import FreshMarketHero from "./FreshMarketHero";
import FreshMarketInfo from "./FreshMarketInfo";
import { resolveBranding, modeFor } from "@/lib/templates";
import TemplateIntro from "@/components/store/TemplateIntro";

// Template Engine V2 — Frutería · Mercado (freshmarket skin).
// Self-contained storefront composition: owns its UI state (search, category,
// selected product) and reuses the existing ProductCard / CategoryBar / CartBar
// / ProductDetailSheet / useCart so no business logic is duplicated or changed.
export default function FreshMarketStorefront({ data, slug }) {
  const { business, categories, products, settings } = data;
  const branding = resolveBranding(business);
  const color = branding.shared.primaryColor || "#16A34A";
  const sf = branding.storefront;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const densityGap = sf.density === "compact" ? "gap-2" : "gap-3";

  const storefront = useStorefrontState({ products, categories, slug, color, defaultQuantity: 0.5 });
  const { searchQuery, setSearchQuery, activeCategory, setActiveCategory, selectedProduct, sheetOpen, productsRef, featured, isSearching, displayProducts, handleQuickAdd, handleCardClick, scrollToProducts, closeSheet } = storefront;

  return (
    <div className="fresh-experience min-h-screen bg-background pb-28 max-w-screen-2xl mx-auto">
      <TemplateIntro variant="fresh" name={business.business_name} slug={slug}/>
      <FreshMarketHeader business={business} branding={branding} slug={slug} searchQuery={searchQuery} onSearch={setSearchQuery} />

      <main>
        {!isSearching && <FreshMarketHero business={business} settings={settings} branding={branding} onShop={scrollToProducts} />}
        {!isSearching && <FreshMarketInfo business={business} settings={settings} branding={branding} />}
        {!isSearching && modeFor(business) === "HYBRID" && (
          <div className="px-4 mt-3">
            <Link to={`/store/${slug}/booking`} className="inline-block text-sm font-semibold underline underline-offset-4" style={{ color }}>Reservar una cita →</Link>
          </div>
        )}
        {settings.temporary_notice && (
          <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">{settings.temporary_notice}</div>
        )}
        {!settings.accept_online_orders && (
          <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">Pedidos online temporalmente no disponibles.</div>
        )}

        <CategoryBar categories={categories} active={activeCategory} onSelect={setActiveCategory} primaryColor={color} />

        <div ref={productsRef} className="px-4">
          {isSearching ? (
            <>
              <p className="text-sm text-muted-foreground mb-3 mt-2">{displayProducts.length} resultado{displayProducts.length !== 1 ? "s" : ""} para “{searchQuery}”</p>
              {displayProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No se encontraron productos.</p>
              ) : (
                <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 ${densityGap}`}>
                  {displayProducts.map(p => <ProductCard key={p.id} product={p} onClick={() => handleCardClick(p)} onQuickAdd={() => handleQuickAdd(p)} primaryColor={color} />)}
                </div>
              )}
            </>
          ) : (
            <>
              {featured.length > 0 && !activeCategory && (
                <div className="mb-5">
                  <h2 className="font-heading font-bold text-lg mb-3" style={{ color: accent }}>Destacados</h2>
                  <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible" style={{ scrollbarWidth: "none" }}>
                    {featured.map(p => (
                      <div key={p.id} className="shrink-0 w-[44vw] sm:w-[200px] md:w-auto">
                        <ProductCard product={p} onClick={() => handleCardClick(p)} onQuickAdd={() => handleQuickAdd(p)} primaryColor={color} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <h2 className="font-heading font-bold text-lg text-foreground mb-3 mt-1">
                {activeCategory ? categories.find(c => c.id === activeCategory)?.name : "Todos los productos"}
              </h2>
              {displayProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No hay productos en esta categoría.</p>
              ) : (
                <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 ${densityGap}`}>
                  {displayProducts.map(p => <ProductCard key={p.id} product={p} onClick={() => handleCardClick(p)} onQuickAdd={() => handleQuickAdd(p)} primaryColor={color} />)}
                </div>
              )}
            </>
          )}
        </div>

      </main>

      <footer className="px-4 py-6 text-center">
        <p className="text-xs text-muted-foreground">Tecnología de <span className="font-semibold" style={{ color }}>RINNO</span></p>
      </footer>

      <CartBar slug={slug} primaryColor={color} />
      <CartToast />
      <ProductDetailSheet product={selectedProduct} open={sheetOpen} onClose={closeSheet} slug={slug} primaryColor={color} />
    </div>
  );
}
