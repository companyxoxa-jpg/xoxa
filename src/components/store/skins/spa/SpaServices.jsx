import { Image } from "@/components/ui/image";
import { Clock } from "lucide-react";
import { formatCurrency } from "@/lib/format";

const SPA_RITUAL_IMAGES = [
  "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=88",
  "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=88",
  "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=88",
  "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=88",
];

// Belleza/Spa V2 — services as photographic cards (not Barbería's editorial
// rows). A centered heading + a 2-column grid of large image-topped cards
// with name, description, duration, price and a "Reservar" link. Generous
// padding, soft rounded corners, hairline borders, calm hover. Selecting a
// card scrolls to the booking wizard (no pre-selection — the wizard is the
// single source of selection).
export default function SpaServices({ services, selected, onSelect, branding }) {
  const sf = branding.storefront;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const headFont = sf.typography.heading === "editorial" ? "font-editorial" : "font-display";
  const spacious = sf.density === "spacious";
  const repeatedImage = services?.length > 1 && new Set(services.map((s) => s.image).filter(Boolean)).size <= 1;
  if (!services?.length) return null;
  return (
    <section id="servicios" className="px-5 sm:px-6 mt-16">
      <div className="text-center mb-8">
        <p className="text-[11px] uppercase tracking-[0.3em] mb-2" style={{ color: accent }}>Tratamientos</p>
        <h2 className={`${headFont} font-semibold text-foreground text-2xl sm:text-3xl`} style={{ letterSpacing: "-0.015em" }}>Elige tu ritual</h2>
      </div>
      <div className={`grid sm:grid-cols-2 ${spacious ? "gap-6" : "gap-4"} max-w-3xl mx-auto`}>
        {services.map((s, index) => {
          const active = selected?.id === s.id;
          const serviceImage = repeatedImage ? SPA_RITUAL_IMAGES[index % SPA_RITUAL_IMAGES.length] : s.image;
          return (
            <button key={s.id} onClick={() => onSelect(s)} className="text-left group bg-card rounded-3xl overflow-hidden border transition-shadow hover:shadow-lg" style={{ borderColor: active ? accent : "hsl(var(--border))" }}>
              <div className="w-full aspect-[3/2] overflow-hidden" style={{ backgroundColor: branding.shared.primaryColor + "10" }}>
                {serviceImage ? <Image src={serviceImage} alt={s.name} fittingType="fill" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /> : <div className="w-full h-full" />}
              </div>
              <div className={spacious ? "p-6" : "p-5"}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className={`${headFont} font-semibold text-foreground text-lg leading-tight`} style={{ letterSpacing: "-0.01em" }}>{s.name}</h3>
                  <p className="font-semibold whitespace-nowrap" style={{ color: accent }}>{formatCurrency(s.price)}</p>
                </div>
                {s.description && <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-2">{s.description}</p>}
                <div className="flex items-center justify-between mt-4">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="w-3.5 h-3.5" style={{ color: accent }} />{s.duration_minutes} min</span>
                  <span className="text-xs font-medium" style={{ color: accent }}>{active ? "Seleccionado →" : "Reservar →"}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
