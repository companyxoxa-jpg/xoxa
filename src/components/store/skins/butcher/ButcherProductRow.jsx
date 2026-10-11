import { Image } from "@/components/ui/image";
import { getProductEmoji } from "@/lib/productEmoji";
import { formatUnitPrice } from "@/lib/format";
import { Plus } from "lucide-react";

// Carnicería V2 — "mostrador digital" row: square image left, name + unit/origin
// + availability center, price + quick-add right. A list, not a card grid.
export default function ButcherProductRow({ product, onClick, onQuickAdd, color, accent, compact }) {
  const emoji = getProductEmoji(product.name);
  const hasOffer = product.compare_at_price && product.compare_at_price > product.price;
  const imgPx = compact ? 56 : 72;
  return (
    <div onClick={onClick} className="flex items-center gap-3 bg-card border border-border rounded-xl p-2.5 cursor-pointer hover:border-foreground/20 transition-colors">
      <div className="rounded-lg overflow-hidden shrink-0" style={{ width: imgPx, height: imgPx, backgroundColor: color + "12" }}>
        {product.image ? (
          <Image src={product.image} alt={product.name} fittingType="fill" className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">{emoji}</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground leading-tight truncate">{product.name}</h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
          {product.origin && <span>Origen: {product.origin}</span>}
          {product.unit_label && <span className="opacity-70">· {product.unit_label}</span>}
        </div>
        <div className="mt-1">
          {product.is_available ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>Disponible</span>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Agotado</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        {hasOffer && <p className="text-[11px] text-muted-foreground line-through leading-none">{formatUnitPrice(product.compare_at_price, product.unit_label)}</p>}
        <p className="text-sm font-bold leading-tight" style={{ color: "var(--accent)" }}>{formatUnitPrice(product.price, product.unit_label)}</p>
        {product.is_available && (
          <button aria-label={`Añadir ${product.name}`} onClick={e => { e.stopPropagation(); onQuickAdd(); }}
            className="mt-1 ml-auto w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--accent)" }}>
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}