import { Image } from "@/components/ui/image";
import { getProductEmoji } from "@/lib/productEmoji";
import { formatUnitPrice } from "@/lib/format";

export default function ProductCard({ product, onClick, onQuickAdd, primaryColor }) {
  const color = primaryColor || "#16A34A";
  const emoji = getProductEmoji(product.name);
  const hasOffer = product.compare_at_price && product.compare_at_price > product.price;

  return (
    <div onClick={onClick}
      className="bg-card border border-border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-shadow flex flex-col">
      <div className="aspect-square rounded-xl overflow-hidden mb-2" style={{ backgroundColor: color + "15" }}>
        {product.image ? (
          <Image src={product.image} alt={product.name} fittingType="fill" className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">{emoji}</div>
        )}
      </div>
      <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-2 flex-1">{product.name}</h3>
      {product.origin && <p className="text-xs text-muted-foreground mt-0.5">Origen: {product.origin}</p>}
      <div className="flex items-end justify-between mt-2">
        <div>
          {hasOffer && <p className="text-xs text-muted-foreground line-through">{formatUnitPrice(product.compare_at_price, product.unit_label)}</p>}
          <p className="text-sm font-bold text-foreground">{formatUnitPrice(product.price, product.unit_label)}</p>
        </div>
        {product.is_available ? (
          <button aria-label={`Añadir ${product.name}`} onClick={(e) => { e.stopPropagation(); onQuickAdd(); }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 text-xl font-bold transition-opacity hover:opacity-90"
            style={{ backgroundColor: color }}>
            +
          </button>
        ) : (
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1.5 rounded-full">Agotado</span>
        )}
      </div>
    </div>
  );
}
