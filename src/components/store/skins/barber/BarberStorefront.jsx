import { useRef, useState } from "react";
import { useBookingFlow } from "@/hooks/useBookingFlow";
import { useCart } from "@/contexts/CartContext";
import { resolveBranding, modeFor } from "@/lib/templates";
import BarberHeader from "./BarberHeader";
import BarberHero from "./BarberHero";
import BarberServices from "./BarberServices";
import BarberProfessionals from "./BarberProfessionals";
import BarberBooking from "./BarberBooking";
import BarberInfo from "./BarberInfo";
import BarberProducts from "./BarberProducts";
import CartBar from "@/components/store/CartBar";
import CartToast from "@/components/store/CartToast";
import ProductDetailSheet from "@/components/store/ProductDetailSheet";
import { Calendar, ShoppingBag } from "lucide-react";
import TemplateIntro from "@/components/store/TemplateIntro";

// Template Engine V2 — Barbería (barber skin). Booking-first storefront:
// editorial hero → services → professionals → inline booking flow → info.
// For HYBRID, a secondary products scroller appears below; booking remains
// the protagonist. Reuses useBookingFlow (shared with BookingStorefront) and
// useCart — no booking or cart logic is duplicated.
export default function BarberStorefront({ data, slug }) {
  const { business, products, settings } = data;
  const branding = resolveBranding(business);
  const color = branding.shared.primaryColor;
  const accent = (branding.storefront.tokens && branding.storefront.tokens.accent) || branding.shared.secondaryColor;
  const flow = useBookingFlow(slug);
  const { addItem } = useCart();
  const bookingRef = useRef(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isHybrid = modeFor(business) === "HYBRID";
  const commerceProducts = isHybrid ? (products || []).filter(p => p.is_available) : [];

  function scrollToBooking() { bookingRef.current?.scrollIntoView({ behavior: "smooth" }); }
  function handleSelectService(s) { flow.selectService(s); scrollToBooking(); }
  function handleSelectProfessional(p) { flow.selectProfessional(p); scrollToBooking(); }
  function handleQuickAdd(p) { addItem(p, p.minimum_quantity || 1, slug, color); }
  function handleProductClick(p) { setSelectedProduct(p); setSheetOpen(true); }

  return (
    <div className="barber-experience min-h-screen bg-background pb-28">
      <TemplateIntro variant="barber" name={business.business_name} slug={slug}/>
      <BarberHeader business={business} branding={branding} slug={slug} onReserve={scrollToBooking} />

      <main>
        <BarberHero business={business} branding={branding} onReserve={scrollToBooking} />
        <BarberInfo business={business} settings={settings} branding={branding} />

        {settings.temporary_notice && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-600 dark:text-amber-400">{settings.temporary_notice}</div>
        )}
        {!settings.accept_online_orders && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-sm text-rose-500">Reservas online temporalmente no disponibles.</div>
        )}

        <BarberServices services={flow.catalog?.services} selected={flow.service} onSelect={handleSelectService} branding={branding} />
        <BarberProfessionals professionals={flow.catalog?.professionals} service={flow.service} onSelect={handleSelectProfessional} branding={branding} />
        <BarberBooking flow={flow} branding={branding} slug={slug} bookingRef={bookingRef} />

        {slug === 'elixir-barber' && (
          <section id="productos" aria-labelledby="elixir-products-title" className="mx-4 sm:mx-6 mt-12 rounded-3xl border border-amber-400/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-6 sm:p-9 text-white shadow-xl">
            <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300"><ShoppingBag className="h-4 w-4" />Tienda ELIXIR · Próximamente</p>
                <h2 id="elixir-products-title" className="font-heading text-2xl font-bold sm:text-3xl">Productos profesionales para tu rutina</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/70">Estamos preparando la selección de productos de la barbería. El catálogo y la compra online se habilitarán aquí próximamente.</p>
              </div>
              <span className="shrink-0 rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white/60">Catálogo en preparación</span>
            </div>
          </section>
        )}

        {isHybrid && <BarberProducts products={commerceProducts} onAdd={handleQuickAdd} onClick={handleProductClick} branding={branding} />}

      </main>

      <footer className="px-4 py-8 text-center mt-4">
        <p className="text-xs text-muted-foreground">{business.business_name} · {business.address || business.city || ""}</p>
        <p className="text-xs text-muted-foreground mt-1">Tecnología de <span className="font-semibold" style={{ color: accent }}>RINNO</span></p>
      </footer>

      {/* Mobile sticky reserve CTA — one tap from anywhere */}
      <button onClick={scrollToBooking} className={`sm:hidden fixed left-4 right-4 z-30 h-12 rounded-full flex items-center justify-center gap-2 text-white font-semibold shadow-lg ${isHybrid ? "bottom-20" : "bottom-4"}`} style={{ backgroundColor: color }}>
        <Calendar className="w-4 h-4" />Reservar cita
      </button>

      {isHybrid && <CartBar slug={slug} primaryColor={color} />}
      <CartToast />
      {isHybrid && <ProductDetailSheet product={selectedProduct} open={sheetOpen} onClose={() => setSheetOpen(false)} slug={slug} primaryColor={color} />}
    </div>
  );
}
