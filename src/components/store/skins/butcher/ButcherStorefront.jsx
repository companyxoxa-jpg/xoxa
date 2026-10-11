import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import CartBar from "@/components/store/CartBar";
import { useStorefrontState } from "@/hooks/useStorefrontState";
import CartToast from "@/components/store/CartToast";
import ProductDetailSheet from "@/components/store/ProductDetailSheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { SlidersHorizontal } from "lucide-react";
import ButcherMasthead from "./ButcherMasthead";
import ButcherHero from "./ButcherHero";
import ButcherCategoryFilter from "./ButcherCategoryFilter";
import ButcherProductRow from "./ButcherProductRow";
import ButcherInfo from "./ButcherInfo";
import { resolveBranding, modeFor } from "@/lib/templates";
import TemplateIntro from "@/components/store/TemplateIntro";

// Template Engine V2 — Carnicería · Mostrador (butcher skin).
// Editorial, structured storefront: masthead + hero + lateral category filter
// (sidebar desktop / drawer mobile) + a "mostrador digital" product LIST.
// Reuses useCart / CartBar / CartToast / ProductDetailSheet — no business logic
// is duplicated. Composition is deliberately different from Frutería.
export default function ButcherStorefront({ data, slug }) {
  const { business, categories, products, settings } = data;
  const branding = resolveBranding(business);
  const color = branding.shared.primaryColor || "#842D32";
  const sf = branding.storefront;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const compact = sf.density === "compact";

  const [filterOpen, setFilterOpen] = useState(false);

  const storefront = useStorefrontState({ products, categories, slug, color, defaultQuantity: 0.5 });
  const { searchQuery, setSearchQuery, activeCategory, setActiveCategory, selectedProduct, sheetOpen, productsRef, featured, isSearching, displayProducts, handleQuickAdd, handleCardClick, scrollToProducts, closeSheet } = storefront;

  const counts = useMemo(() => {
    const m = {};
    for (const p of products) { m[p.category_id] = (m[p.category_id] || 0) + 1; }
    return m;
  }, [products]);

  function selectCategory(id) { setActiveCategory(id); setFilterOpen(false); }

  const accentStyle = { "--accent": accent };

  const ProductList = ({ items }) => (
    <div className={`space-y-2.5 ${compact ? "" : "sm:space-y-3"}`}>
      {items.map(p => (
        <ButcherProductRow key={p.id} product={p} onClick={() => handleCardClick(p)} onQuickAdd={() => handleQuickAdd(p)} color={color} accent={accent} compact={compact} />
      ))}
    </div>
  );

  return (
    <div className="butcher-experience min-h-screen bg-background pb-28" style={accentStyle}>
      <TemplateIntro variant="butcher" name={business.business_name} slug={slug}/>
      <ButcherMasthead business={business} branding={branding} slug={slug} searchQuery={searchQuery} onSearch={setSearchQuery} />

      <main className="max-w-screen-2xl mx-auto">
        {!isSearching && <ButcherHero business={business} settings={settings} branding={branding} onShop={scrollToProducts} />}
        {!isSearching && <ButcherInfo business={business} settings={settings} branding={branding} />}
        {!isSearching && modeFor(business) === "HYBRID" && (
          <div className="px-4 mt-3"><Link to={`/store/${slug}/booking`} className="inline-block text-sm font-semibold underline underline-offset-4" style={{ color }}>Reservar una cita →</Link></div>
        )}
        {settings.temporary_notice && <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">{settings.temporary_notice}</div>}
        {!settings.accept_online_orders && <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">Pedidos online temporalmente no disponibles.</div>}

        {/* Mobile filter trigger */}
        <div className="lg:hidden px-4 mt-3">
          <button onClick={() => setFilterOpen(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground">
            <SlidersHorizontal className="w-4 h-4" />Filtrar por categoría{activeCategory ? ` · ${categories.find(c => c.id === activeCategory)?.name || ""}` : ""}
          </button>
        </div>

        {/* Desktop: sidebar + content */}
        <div className="px-4 mt-4 lg:grid lg:grid-cols-[240px_1fr] lg:gap-6">
          <aside className="hidden lg:block">
            <div className="sticky top-[260px]">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-2" style={{ color: accent }}>Categorías</h2>
              <ButcherCategoryFilter categories={categories} active={activeCategory} onSelect={setActiveCategory} counts={categories.map(c => ({ ...c, count: counts[c.id] || 0 }))} />
            </div>
          </aside>

          <div ref={productsRef}>
            {isSearching ? (
              <>
                <p className="text-sm text-muted-foreground mb-3">{displayProducts.length} resultado{displayProducts.length !== 1 ? "s" : ""} para “{searchQuery}”</p>
                {displayProducts.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">No se encontraron productos.</p> : <ProductList items={displayProducts} />}
              </>
            ) : (
              <>
                {featured.length > 0 && !activeCategory && (
                  <div className="mb-5">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-2.5" style={{ color: accent }}>Selección de hoy</h2>
                    <ProductList items={featured} />
                  </div>
                )}
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-2.5" style={{ color: accent }}>
                  {activeCategory ? categories.find(c => c.id === activeCategory)?.name : "El mostrador"}
                </h2>
                {displayProducts.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">No hay productos en esta categoría.</p> : <ProductList items={displayProducts} />}
              </>
            )}
          </div>
        </div>

      </main>

      <footer className="px-4 py-6 text-center">
        <p className="text-xs text-muted-foreground">Tecnología de <span className="font-semibold" style={{ color: accent }}>RINNO</span></p>
      </footer>

      <CartBar slug={slug} primaryColor={color} />
      <CartToast />
      <ProductDetailSheet product={selectedProduct} open={sheetOpen} onClose={closeSheet} slug={slug} primaryColor={color} />

      {/* Mobile category drawer */}
      <Drawer open={filterOpen} onOpenChange={setFilterOpen}>
        <DrawerContent>
          <DrawerHeader><DrawerTitle>Categorías</DrawerTitle></DrawerHeader>
          <div className="px-4 pb-6">
            <ButcherCategoryFilter categories={categories} active={activeCategory} onSelect={selectCategory} counts={categories.map(c => ({ ...c, count: counts[c.id] || 0 }))} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
