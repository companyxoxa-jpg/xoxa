import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import BookingStorefront from '@/components/booking/BookingStorefront';
import StorefrontSkin from '@/components/store/skins/StorefrontSkin';
import { resolveBranding, modeFor } from "@/lib/templates";
import { getStorefrontComponent } from "@/components/store/skins/registry";
import { Link } from 'react-router-dom';
import { rememberStoreSlug } from '@/lib/storeContext';
import StoreHeader from "@/components/store/StoreHeader";

import CategoryBar from "@/components/store/CategoryBar";
import ProductCard from "@/components/store/ProductCard";
import ProductDetailSheet from "@/components/store/ProductDetailSheet";
import CartBar from "@/components/store/CartBar";
import CartToast from "@/components/store/CartToast";
import { Search, Loader2, Store as StoreIcon } from "lucide-react";
import { useStorefrontState } from "@/hooks/useStorefrontState";

export default function Store() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    rememberStoreSlug(slug);
    let active = true;
    setLoading(true); setError(null); setData(null);
    async function load() {
      try {
        const res = await base44.functions.invoke("GetStorefront", { slug });
        if (!active) return;
        setData(res.data);
        if (res.data?.business) {
          document.title = `${res.data.business.business_name} | RINNO`;
        }
      } catch (e) {
        if (!active) return;
        setError(e.response?.data?.error || "No se pudo cargar la tienda");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [slug]);

  const color = data?.business?.primary_color || "#16A34A";
  const storefront = useStorefrontState({ products: data?.products || [], categories: data?.categories || [], slug, color, defaultQuantity: 0.5 });
  const { searchQuery, setSearchQuery, activeCategory, setActiveCategory, selectedProduct, sheetOpen, productsRef, displayProducts, featured, handleQuickAdd, handleCardClick, scrollToProducts, closeSheet } = storefront;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <StoreIcon className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-lg font-heading font-bold text-foreground mb-1">Tienda no encontrada</p>
        <p className="text-sm text-muted-foreground">{error || "La tienda no está disponible"}</p>
      </div>
    );
  }

  const { business, categories, settings } = data;
  const sfSkin = resolveBranding(business).storefront.skin;
  const StorefrontV2 = getStorefrontComponent(sfSkin);
  if (StorefrontV2) return <StorefrontV2 data={data} slug={slug} />;
  if (modeFor(business) === 'BOOKING') return <BookingStorefront key={slug} business={business} slug={slug} />;

  return (
    <div className="min-h-screen bg-background pb-24 max-w-screen-2xl mx-auto">
      <StoreHeader business={business} slug={slug} onToggleSearch={() => { setSearchOpen(!searchOpen); setSearchQuery(""); }} primaryColor={color} />

      {searchOpen && (
        <div className="relative z-20 bg-card border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar productos..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': color }}
            />
          </div>
        </div>
      )}

      <main>
        {searchQuery ? (
          <div className="px-4 py-4">
            <p className="text-sm text-muted-foreground mb-3">{displayProducts.length} resultado{displayProducts.length !== 1 ? "s" : ""} para "{searchQuery}"</p>
            {displayProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No se encontraron productos.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {displayProducts.map(p => (
                  <ProductCard key={p.id} product={p} onClick={() => handleCardClick(p)} onQuickAdd={() => handleQuickAdd(p)} primaryColor={color} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <StorefrontSkin business={business} onAction={scrollToProducts} />
            {modeFor(business) === 'HYBRID' && <Link className="inline-block mx-4 my-3 underline" to={`/store/${slug}/booking`}>Reservar una cita →</Link>}

            {settings.temporary_notice && (
              <div className="mx-4 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                {settings.temporary_notice}
              </div>
            )}

            {!settings.accept_online_orders && (
              <div className="mx-4 mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
                Pedidos online temporalmente no disponibles.
              </div>
            )}

            <CategoryBar categories={categories} active={activeCategory} onSelect={setActiveCategory} primaryColor={color} />

            <div ref={productsRef}>
              {!activeCategory && featured.length > 0 && (
                <div className="px-4 mb-5">
                  <h2 className="font-heading font-bold text-lg text-foreground mb-3">Destacados</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {featured.map(p => (
                      <ProductCard key={p.id} product={p} onClick={() => handleCardClick(p)} onQuickAdd={() => handleQuickAdd(p)} primaryColor={color} />
                    ))}
                  </div>
                </div>
              )}

              <div className="px-4">
                <h2 className="font-heading font-bold text-lg text-foreground mb-3">
                  {activeCategory ? categories.find(c => c.id === activeCategory)?.name : "Todos los productos"}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {displayProducts.map(p => (
                    <ProductCard key={p.id} product={p} onClick={() => handleCardClick(p)} onQuickAdd={() => handleQuickAdd(p)} primaryColor={color} />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="px-4 py-8 text-center mt-4">
        <p className="text-xs text-muted-foreground">Tecnología de <span className="font-semibold">RINNO</span></p>
      </footer>

      <CartBar slug={slug} primaryColor={color} />
      <CartToast />
      <ProductDetailSheet product={selectedProduct} open={sheetOpen} onClose={closeSheet} slug={slug} primaryColor={color} />
    </div>
  );
}