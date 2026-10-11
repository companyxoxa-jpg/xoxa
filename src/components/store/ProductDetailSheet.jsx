import { useState, useEffect } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { getProductEmoji } from "@/lib/productEmoji";
import { formatCurrency, formatUnitPrice } from "@/lib/format";
import QuantitySelector from "./QuantitySelector";
import { useCart } from "@/contexts/CartContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function ProductDetailSheet({ product, open, onClose, slug, primaryColor }) {
  const { addItem, forceAddItem } = useCart();
  const [quantity, setQuantity] = useState(0.5);
  const [showCrossTenant, setShowCrossTenant] = useState(false);
  const color = primaryColor || "#16A34A";

  useEffect(() => {
    if (product) setQuantity(product.minimum_quantity || 0.5);
  }, [product]);

  if (!product) return null;

  const emoji = getProductEmoji(product.name);
  const subtotal = Math.round(quantity * product.price);
  const hasOffer = product.compare_at_price && product.compare_at_price > product.price;

  function handleAdd() {
    const result = addItem(product, quantity, slug, color);
    if (result === "cross-tenant") {
      setShowCrossTenant(true);
      return;
    }
    onClose();
  }

  function confirmCrossTenant() {
    forceAddItem(product, quantity, slug, color);
    setShowCrossTenant(false);
    onClose();
  }

  return (
    <>
      <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent className="max-h-[88vh]">
          <div className="px-5 pb-6 overflow-y-auto">
            <div className="w-full aspect-[4:3] rounded-2xl flex items-center justify-center text-7xl mb-4"
              style={{ backgroundColor: color + "12" }}>
              {emoji}
            </div>
            <h2 className="text-xl font-heading font-bold text-foreground">{product.name}</h2>
            {product.origin && <p className="text-sm text-muted-foreground mt-1">Origen: {product.origin}</p>}
            {product.description && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{product.description}</p>}

            <div className="flex items-baseline gap-2 mt-3">
              {hasOffer && <span className="text-sm text-muted-foreground line-through">{formatUnitPrice(product.compare_at_price, product.unit_label)}</span>}
              <span className="text-2xl font-bold text-foreground">{formatUnitPrice(product.price, product.unit_label)}</span>
            </div>

            {!product.is_available ? (
              <div className="mt-4 text-center py-6 bg-muted rounded-xl">
                <p className="text-base font-semibold text-muted-foreground">Agotado</p>
                <p className="text-xs text-muted-foreground mt-1">Vuelve a intentarlo más tarde</p>
              </div>
            ) : (
              <>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Cantidad</span>
                  <QuantitySelector
                    quantity={quantity}
                    min={product.minimum_quantity || 0.5}
                    step={product.quantity_step || 0.5}
                    unitLabel={product.unit_label}
                    onChange={setQuantity}
                    primaryColor={color}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between p-4 bg-muted rounded-xl">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="text-xl font-bold text-foreground">{formatCurrency(subtotal)}</span>
                </div>
                <button onClick={handleAdd}
                  className="mt-4 w-full py-4 rounded-xl text-white font-semibold text-base shadow-sm transition-opacity hover:opacity-90"
                  style={{ backgroundColor: color }}>
                  Añadir al carrito · {formatCurrency(subtotal)}
                </button>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={showCrossTenant} onOpenChange={setShowCrossTenant}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar de comercio?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu carrito tiene productos de otro comercio. Si continúas, se vaciará el carrito actual y se añadirá este producto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCrossTenant}>Vaciar y añadir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
