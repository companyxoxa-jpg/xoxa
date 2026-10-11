import { useCart } from "@/contexts/CartContext";
import { formatCurrency } from "@/lib/format";
import { ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CartBar({ slug, primaryColor }) {
  const { count, total, businessSlug } = useCart();
  const navigate = useNavigate();
  const color = primaryColor || "#16A34A";

  if (count === 0) return null;

  return (
    <div style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }} className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-background to-transparent pb-4">
      <button onClick={() => navigate(`/store/${businessSlug || slug}/cart`)}
        className="w-full max-w-2xl mx-auto flex items-center justify-between px-5 py-3.5 rounded-2xl text-white font-semibold shadow-lg transition-opacity hover:opacity-95"
        style={{ backgroundColor: color }}>
        <span className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          Ver carrito · {count} {count === 1 ? "artículo" : "artículos"}
        </span>
        <span>{formatCurrency(total)}</span>
      </button>
    </div>
  );
}
