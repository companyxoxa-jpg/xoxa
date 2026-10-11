import { Image } from "@/components/ui/image";

// Belleza/Spa V2 — professionals as large portrait tiles with the name
// overlaid at the bottom (not Barbería's card-with-below-text). A horizontal
// scroller on mobile, a 3-column grid on desktop. Tapping a tile (when a
// service is chosen and the professional serves it) scrolls to the booking
// wizard.
export default function SpaProfessionals({ professionals, service, onSelect, branding }) {
  const sf = branding.storefront;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const headFont = sf.typography.heading === "editorial" ? "font-editorial" : "font-display";
  if (!professionals?.length) return null;
  const eligible = service ? professionals.filter(p => p.service_ids?.includes(service.id)) : professionals;

  function handlePick(p) { if (!service || p.service_ids?.includes(service.id)) onSelect(p); }

  return (
    <section id="profesionales" className="px-5 sm:px-6 mt-16">
      <div className="text-center mb-8">
        <p className="text-[11px] uppercase tracking-[0.3em] mb-2" style={{ color: accent }}>Equipo</p>
        <h2 className={`${headFont} font-semibold text-foreground text-2xl sm:text-3xl`} style={{ letterSpacing: "-0.015em" }}>Manos expertas</h2>
      </div>
      <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto md:overflow-visible pb-2 md:pb-0 max-w-4xl mx-auto" style={{ scrollbarWidth: "none" }}>
        {eligible.map(p => (
          <button key={p.id} onClick={() => handlePick(p)} className="shrink-0 w-[72vw] sm:w-auto relative rounded-3xl overflow-hidden text-left group" style={{ aspectRatio: "3 / 4" }}>
            <div className="absolute inset-0" style={{ backgroundColor: branding.shared.primaryColor + "14" }}>
              {p.photo ? <Image src={p.photo} alt={p.name} fittingType="fill" className="w-full h-full group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center font-editorial text-5xl text-muted-foreground/60">{p.name?.[0] || "?"}</div>}
            </div>
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.66) 100%)" }} />
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
              <p className={`${headFont} font-semibold text-lg leading-tight`} style={{ letterSpacing: "-0.01em" }}>{p.name}</p>
              {p.specialty && <p className="text-white/80 text-xs mt-1">{p.specialty}</p>}
              {service && p.service_ids?.includes(service.id) && <span className="inline-block mt-3 text-[11px] font-medium px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.18)" }}>Reservar con {p.name.split(" ")[0]}</span>}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}