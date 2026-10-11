import { Switch } from "@/components/ui/switch";
import { formatUnitPrice } from "@/lib/format";
import { Package } from "lucide-react";

export default function ProductStockToggle({ products, onToggle }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          Disponibilidad de productos
        </h2>
        <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-full">{products.length}</span>
      </div>
      {products.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground">No hay productos cargados.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${p.is_available ? "bg-emerald-500/10" : "bg-muted"}`}>
                <Package className={`w-4 h-4 ${p.is_available ? "text-emerald-400" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${p.is_available ? "text-foreground" : "text-muted-foreground line-through"}`}>{p.name}</p>
                <span className="text-xs font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {formatUnitPrice(p.price, p.unit_label)}
                </span>
              </div>
              <Switch checked={p.is_available} onCheckedChange={(v) => onToggle(p.id, v)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}