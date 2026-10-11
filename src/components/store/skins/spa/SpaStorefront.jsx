import { useRef, useState } from "react";
import { useBookingFlow } from "@/hooks/useBookingFlow";
import { useCart } from "@/contexts/CartContext";
import { resolveBranding, modeFor } from "@/lib/templates";
import SpaHeader from "./SpaHeader";
import SpaHero from "./SpaHero";
import SpaServices from "./SpaServices";
import SpaProfessionals from "./SpaProfessionals";
import SpaBooking from "./SpaBooking";
import SpaInfo from "./SpaInfo";
import SpaProducts from "./SpaProducts";
import CartBar from "@/components/store/CartBar";
import CartToast from "@/components/store/CartToast";
import ProductDetailSheet from "@/components/store/ProductDetailSheet";
import { Calendar } from "lucide-react";
import TemplateIntro from "@/components/store/TemplateIntro";

// Template Engine V2 — Belleza/Spa (spa skin). Booking-first, premium & calm:
// airy header → photographic hero → treatment cards → portrait professionals →
// wizard booking flow → airy info → (HYBRID) secondary products. Reuses
// useBookingFlow (shared) and useCart — no booking/cart logic duplicated.
export default function SpaStorefront({ data, slug }) {
  const { business, products, settings } = data;
  const branding = resolveBranding(business);
  const color = branding.shared.primaryColor;
  const flow = useBookingFlow(slug);
  const { addItem } = useCart();
  const bookingRef = useRef(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isHybrid = modeFor(business) === "HYBRID";
  const commerceProducts = isHybrid ? (products || []).filter(p => p.is_available) : [];

  function scrollToBooking() { bookingRef.current?.scrollIntoView({ behavior: "smooth" }); }
  function handleQuickAdd(p) { addItem(p, p.minimum_quantity || 1, slug, color); }
  function handleProductClick(p) { setSelectedProduct(p); setSheetOpen(true); }

  return (
    <div className="spa-experience min-h-screen bg-background pb-28">
      <TemplateIntro variant="spa" name={business.business_name} slug={slug}/>
      <SpaHeader business={business} branding={branding} slug={slug} onReserve={scrollToBooking} />

      <main>
        <SpaHero business={business} branding={branding} onReserve={scrollToBooking} />
        <SpaInfo business={business} settings={settings} branding={branding} />

        {settings.temporary_notice && (
          <div className="mx-5 sm:mx-6 mt-5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-sm text-amber-600 dark:text-amber-400">{settings.temporary_notice}</div>
        )}
        {!settings.accept_online_orders && (
          <div className="mx-5 sm:mx-6 mt-5 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-sm text-rose-500">Reservas online temporalmente no disponibles.</div>
        )}

        <SpaServices services={flow.catalog?.services} selected={flow.service} onSelect={scrollToBooking} branding={branding} />
        <SpaProfessionals professionals={flow.catalog?.professionals} service={flow.service} onSelect={scrollToBooking} branding={branding} />
        <SpaBooking flow={flow} branding={branding} slug={slug} bookingRef={bookingRef} />

        {isHybrid && <SpaProducts products={commerceProducts} onAdd={handleQuickAdd} onClick={handleProductClick} branding={branding} />}

      </main>

      <footer className="px-5 py-10 text-center mt-4">
        <p className="text-xs text-muted-foreground">{business.business_name} · {business.address || business.city || ""}</p>
        <p className="text-xs text-muted-foreground mt-1">Tecnología de <span className="font-semibold" style={{ color: branding.shared.secondaryColor }}>RINNO</span></p>
      </footer>

      <button onClick={scrollToBooking} className={`sm:hidden fixed left-4 right-4 z-30 h-12 rounded-full flex items-center justify-center gap-2 text-white font-medium shadow-lg ${isHybrid ? "bottom-20" : "bottom-4"}`} style={{ backgroundColor: color }}>
        <Calendar className="w-4 h-4" />Reservar tratamiento
      </button>

      {isHybrid && <CartBar slug={slug} primaryColor={color} />}
      <CartToast />
      {isHybrid && <ProductDetailSheet product={selectedProduct} open={sheetOpen} onClose={() => setSheetOpen(false)} slug={slug} primaryColor={color} />}
    </div>
  );
}
