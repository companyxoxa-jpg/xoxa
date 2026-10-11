import { Image } from "@/components/ui/image";
import { Plus } from "lucide-react";
import { formatUnitPrice } from "@/lib/format";

// Belleza/Spa V2 — secondary products (HYBRID only). A refined horizontal
// scroller of soft cards as a complement to the booking experience. Reuses
// useCart (passed via onAdd) — no logic here.
export default function SpaProducts({ products, onAdd, onClick, branding }) {
  const sf = branding.storefront;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const headFont = sf.typography.heading === "editorial" ? "font-editorial" : "font-display";
  if (!products?.length) return null;
  return (
    <section className="px-5 sm:px-6 mt-16">
      <div className="text-center mb-6">
        <p className="text-[11px] uppercase tracking-[0.3em] mb-2" style={{ color: accent }}>Para llevar</p>
        <h2 className={`${headFont} font-semibold text-foreground text-2xl`} style={{ letterSpacing: "-0.015em" }}>Complementos</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 max-w-3xl mx-auto" style={{ scrollbarWidth: "none" }}>
        {products.map(p => (
          <div key={p.id} onClick={onClick ? () => onClick(p) : undefined} className="shrink-0 w-[160px] bg-card rounded-3xl border border-border overflow-hidden">
            <div className="h-24 w-full overflow-hidden" style={{ backgroundColor: branding.shared.primaryColor + "10" }}>
              {p.image ? <Image src={p.image} alt={p.name} fittingType="fill" className="w-full h-full" /> : <div className="w-full h-full" />}
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{p.name}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-semibold" style={{ color: accent }}>{formatUnitPrice(p.price, p.unit_label)}</span>
                {p.is_available && onAdd && (
                  <button aria-label={`Añadir ${p.name}`} onClick={e => { e.stopPropagation(); onAdd(p); }} className="w-7 h-7 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: accent }}><Plus className="w-4 h-4" /></button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}