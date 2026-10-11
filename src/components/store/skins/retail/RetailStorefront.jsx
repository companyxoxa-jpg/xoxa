import { useState } from "react";
import { resolveBranding, modeFor } from "@/lib/templates";
import { Link } from "react-router-dom";
import { useStorefrontState } from "@/hooks/useStorefrontState";
import RetailHeader from "./RetailHeader";
import RetailHero from "./RetailHero";
import RetailCollections from "./RetailCollections";
import RetailProducts from "./RetailProducts";
import RetailInfo from "./RetailInfo";
import CartBar from "@/components/store/CartBar";
import CartToast from "@/components/store/CartToast";
import ProductDetailSheet from "@/components/store/ProductDetailSheet";
import RetailProductCard from "./RetailProductCard";
import TemplateIntro from "@/components/store/TemplateIntro";

// Template Engine V2 — Retail (retail skin). Commerce-first, discovery-led:
// utility bar → brand+search header → category nav pills → campaign/collection
// hero → collections tiles (desktop) → featured strip → catalog grid → info
// footer. Reuses useCart + ProductDetailSheet — no cart/checkout/order logic
// duplicated.
export default function RetailStorefront({ data, slug }) {
  const { business, categories, products, settings } = data;
  const branding = resolveBranding(business);
  const color = branding.shared.primaryColor;
  const storefront = useStorefrontState({ products, categories, slug, color, defaultQuantity: 1 });
  const { searchQuery, setSearchQuery, activeCategory, setActiveCategory, selectedProduct, sheetOpen, productsRef, isSearching, displayProducts, handleQuickAdd, handleCardClick, scrollToProducts, closeSheet } = storefront;
  const [searchOpen, setSearchOpen] = useState(false);
  function toggleSearch() { setSearchOpen((v) => !v); setSearchQuery(""); }

  return (
    <div className="retail-experience min-h-screen bg-background pb-28">
      <TemplateIntro variant="retail" name={business.business_name} slug={slug}/>
      <RetailHeader
        business={business} branding={branding} slug={slug}
        categories={categories} activeCategory={activeCategory} onSelectCategory={setActiveCategory}
        searchQuery={searchQuery} onSearchChange={setSearchQuery} searchOpen={searchOpen} onToggleSearch={toggleSearch}
      />

      <main>
        {!isSearching && <RetailHero business={business} branding={branding} categories={categories} onShop={scrollToProducts} onSelectCategory={(id) => { setActiveCategory(id); scrollToProducts(); }} />}
        {!isSearching && <RetailInfo business={business} settings={settings} branding={branding} />}
        {!isSearching && modeFor(business) === "HYBRID" && (
          <div className="px-4 sm:px-5 mt-3">
            <Link to={`/store/${slug}/booking`} className="inline-block text-sm font-semibold underline underline-offset-4" style={{ color }}>Reservar una cita →</Link>
          </div>
        )}
        {settings.temporary_notice && (
          <div className="mx-4 sm:mx-5 mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-600 dark:text-amber-400">{settings.temporary_notice}</div>
        )}
        {!settings.accept_online_orders && (
          <div className="mx-4 sm:mx-5 mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-sm text-rose-500">Pedidos online temporalmente no disponibles.</div>
        )}

        {!isSearching && <RetailCollections categories={categories} onSelect={(id) => { setActiveCategory(id); scrollToProducts(); }} branding={branding} />}

        <div ref={productsRef}>
          {isSearching ? (
            <div className="px-4 sm:px-5 mt-6">
              <p className="text-sm text-muted-foreground mb-4">{displayProducts.length} resultado{displayProducts.length !== 1 ? "s" : ""} para “{searchQuery}”</p>
              {displayProducts.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border p-10 text-center">
                  <p className="text-sm font-medium text-foreground">No se encontraron productos</p>
                  <p className="text-xs text-muted-foreground mt-1">Prueba con otro término.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {displayProducts.map((p) => <RetailProductCardMini key={p.id} product={p} categories={categories} onAdd={handleQuickAdd} onClick={handleCardClick} branding={branding} />)}
                </div>
              )}
            </div>
          ) : (
            <RetailProducts
              products={products} categories={categories} activeCategory={activeCategory}
              onAdd={handleQuickAdd} onClick={handleCardClick} branding={branding}
            />
          )}
        </div>

      </main>

      <CartBar slug={slug} primaryColor={color} />
      <CartToast />
      <ProductDetailSheet product={selectedProduct} open={sheetOpen} onClose={closeSheet} slug={slug} primaryColor={color} />
    </div>
  );
}

// Inline wrapper for the search results grid. Delegates to RetailProductCard.
function RetailProductCardMini({ product, categories, onAdd, onClick, branding }) {
  const cat = categories.find((c) => c.id === product.category_id);
  return <RetailProductCard product={product} category={cat} onAdd={onAdd} onClick={onClick} branding={branding} />;
}
