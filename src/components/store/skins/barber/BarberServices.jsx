import { Image } from "@/components/ui/image";
import { Clock, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/format";

const BARBER_EDITORIAL_IMAGES = [
  "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=88",
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=900&q=88",
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=88",
  "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=900&q=88",
];

// Barbería V2 — services presented as services (not products). Editorial rows:
// a large image left, name + description + duration + price right, with a
// "Reservar" action that pre-selects the service in the booking flow and
// scrolls to it. Vertical list, never a product grid.
export default function BarberServices({ services, selected, onSelect, branding }) {
  const sf = branding.storefront;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const headFont = sf.typography.heading === "editorial" ? "font-editorial" : "font-display";
  const compact = sf.density === "compact";
  const repeatedImage = services?.length > 1 && new Set(services.map((s) => s.image).filter(Boolean)).size <= 1;

  if (!services?.length) return null;
  return (
    <section id="servicios" className="px-4 sm:px-6 mt-10">
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] mb-1.5" style={{ color: accent }}>Servicios</p>
          <h2 className={`${headFont} font-bold text-foreground text-2xl sm:text-3xl leading-tight`}>Elige tu momento</h2>
        </div>
      </div>
      <div className="space-y-3">
        {services.map((s, index) => {
          const active = selected?.id === s.id;
          const serviceImage = repeatedImage ? BARBER_EDITORIAL_IMAGES[index % BARBER_EDITORIAL_IMAGES.length] : s.image;
          return (
            <button key={s.id} onClick={() => onSelect(s)} className={`w-full text-left grid sm:grid-cols-[160px_1fr_auto] gap-4 items-center bg-card rounded-2xl overflow-hidden border-2 transition-colors ${compact ? "p-2" : "p-3"}`} style={{ borderColor: active ? accent : "transparent" }}>
              <div className="w-full h-32 sm:h-[112px] rounded-xl overflow-hidden" style={{ backgroundColor: branding.shared.primaryColor + "14" }}>
                {serviceImage ? <Image src={serviceImage} alt={s.name} fittingType="fill" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /> : <div className="w-full h-full" />}
              </div>
              <div className="min-w-0">
                <h3 className={`${headFont} font-bold text-foreground text-lg leading-tight truncate`}>{s.name}</h3>
                {s.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mt-2"><Clock className="w-3.5 h-3.5" style={{ color: accent }} />{s.duration_minutes} min</p>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pl-0 sm:pl-2 sm:pr-1">
                <p className="font-bold text-lg" style={{ color: accent }}>{formatCurrency(s.price)}</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: accent }}>{active ? "Seleccionado" : "Reservar"}<ArrowRight className="w-3.5 h-3.5" /></span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
