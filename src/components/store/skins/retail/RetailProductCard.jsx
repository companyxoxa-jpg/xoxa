import { Image } from "@/components/ui/image";
import { Plus } from "lucide-react";
import { formatUnitPrice } from "@/lib/format";

// Template Engine V2 — Retail product card. Portrait (4:5), with a small
// category label, name, price (with compare_at strike-through reference
// price when the business set one — a real Product field, not invented),
// and an accent add button. Distinct from the V1 ProductCard (square, no
// category label, inline add). Agotado overlay when !is_available.
export default function RetailProductCard({ product, category, onAdd, onClick, branding }) {
  const sf = branding.storefront;
  const accent = (sf.tokens && sf.tokens.accent) || branding.shared.secondaryColor;
  const hasOffer = product.compare_at_price && product.compare_at_price > product.price;
  const soldOut = !product.is_available;

  return (
    <div className="flex flex-col bg-card rounded-2xl border border-border overflow-hidden transition-shadow hover:shadow-md">
      <button onClick={() => onClick(product)} className="relative block w-full aspect-[4/5] overflow-hidden" style={{ backgroundColor: branding.shared.primaryColor + "12" }} aria-label={product.name}>
        {product.image
          ? <Image src={product.image} alt={product.name} fittingType="fill" className="w-full h-full" />
          : <div className="w-full h-full flex items-center justify-center font-display text-4xl text-muted-foreground/30">{(product.name || "?").slice(0, 1)}</div>}
        {soldOut && <div className="absolute inset-0 bg-background/72 flex items-center justify-center"><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Agotado</span></div>}
        {hasOffer && !soldOut && <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: accent }}>Oferta</span>}
      </button>
      <div className="p-2.5 flex flex-col flex-1">
        {category && <span className="text-[10px] uppercase tracking-wide font-medium truncate" style={{ color: accent }}>{category.name}</span>}
        <h3 className="font-medium text-sm text-foreground leading-snug line-clamp-2 mt-0.5">{product.name}</h3>
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5 min-w-0">
            {hasOffer && <span className="text-xs text-muted-foreground line-through shrink-0">{formatUnitPrice(product.compare_at_price, product.unit_label)}</span>}
            <span className="font-semibold text-foreground truncate">{formatUnitPrice(product.price, product.unit_label)}</span>
          </div>
          {!soldOut && onAdd && (
            <button onClick={(e) => { e.stopPropagation(); onAdd(product); }} className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 transition-transform hover:scale-105" style={{ backgroundColor: accent }} aria-label={`Añadir ${product.name}`}>
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}