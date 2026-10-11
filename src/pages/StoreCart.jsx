import { useCart } from "@/contexts/CartContext";
import { formatCurrency, formatUnitPrice } from "@/lib/format";
import { getProductEmoji } from "@/lib/productEmoji";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2, ShoppingBag } from "lucide-react";
import QuantitySelector from "@/components/store/QuantitySelector";
import CartToast from "@/components/store/CartToast";

export default function StoreCart() {
  const { slug } = useParams();
  const { items, total, updateQuantity, removeItem, primaryColor } = useCart();
  const navigate = useNavigate();
  const color = primaryColor || "#16A34A";

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <ShoppingBag className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-lg font-heading font-bold text-foreground mb-1">Tu cesta está vacía</p>
        <p className="text-sm text-muted-foreground mb-6">Añade productos para empezar tu pedido.</p>
        <button onClick={() => navigate(`/store/${slug}`)}
          className="px-6 py-3 rounded-xl text-white font-semibold text-sm" style={{ backgroundColor: color }}>
          Volver a la tienda
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/store/${slug}`)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-heading font-bold text-lg text-foreground">Tu cesta</h1>
      </header>

      <div className="px-4 py-4 space-y-3">
        {items.map(item => (
          <div key={item.product_id} className="bg-card border border-border rounded-xl p-3 flex gap-3">
            <div className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl shrink-0" style={{ backgroundColor: color + "15" }}>
              {getProductEmoji(item.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
                <button onClick={() => removeItem(item.product_id)} className="text-muted-foreground hover:text-destructive shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{formatUnitPrice(item.price, item.unit_label)}</p>
              <div className="mt-2">
                <QuantitySelector
                  quantity={item.quantity}
                  min={item.minimum_quantity || (item.unit_type === 'unit' ? 1 : 0.5)}
                  step={item.quantity_step || (item.unit_type === 'unit' ? 1 : 0.5)}
                  unitLabel={item.unit_label}
                  onChange={(q) => updateQuantity(item.product_id, q, item.minimum_quantity || (item.unit_type === 'unit' ? 1 : 0.5))}
                  primaryColor={color}
                />
              </div>
            </div>
            <div className="text-right shrink-0 self-center">
              <p className="text-sm font-bold text-foreground">{formatCurrency(Math.round(item.quantity * item.price))}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 mt-2">
        <div className="bg-muted rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Entrega</span>
            <span className="text-muted-foreground">Se calcula al continuar</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between">
            <span className="font-heading font-bold text-foreground">Total provisional</span>
            <span className="font-heading font-bold text-foreground">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-background to-transparent pb-4">
        <button onClick={() => navigate(`/store/${slug}/checkout`)}
          className="w-full max-w-2xl mx-auto py-4 rounded-2xl text-white font-semibold shadow-lg transition-opacity hover:opacity-95" style={{ backgroundColor: color }}>
          CONTINUAR · {formatCurrency(total)}
        </button>
      </div>
      <CartToast />
    </div>
  );
}
